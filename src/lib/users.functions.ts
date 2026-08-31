import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ModuleKey } from "@/lib/permissions";

// Thin RPC wrappers only. All runtime helpers live in users.server.ts.

/** Public: maps a typed name to its internal login identity. */
export const resolveLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => ({ name: String(data.name ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    const { nameKey } = await import("@/lib/users.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = nameKey(data.name);
    if (!key) return { found: false as const };
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("login_email, status")
      .eq("name_key", key)
      .maybeSingle();
    if (!row) return { found: false as const };
    return {
      found: true as const,
      loginEmail: row.login_email as string,
      disabled: row.status !== "active",
    };
  });

/** Public: a new person requests access; the admin is emailed a temp password. */
export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => ({ name: String(data.name ?? "").trim().slice(0, 120) }))
  .handler(async ({ data }) => {
    const { nameKey, loginEmailFor, generateTempPassword, notifyAdminOfAccessRequest } = await import(
      "@/lib/users.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = nameKey(data.name);
    if (key.length < 2) return { ok: false as const, reason: "Please enter your full name." };

    const { data: existing } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("name_key", key)
      .maybeSingle();
    if (existing) return { ok: false as const, reason: "That name is already registered. Ask the administrator for your password." };

    const loginEmail = loginEmailFor(data.name);
    const tempPassword = generateTempPassword();
    const created = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: data.name.trim() },
    });
    if (created.error || !created.data.user) {
      return { ok: false as const, reason: "Could not register that name. Please contact the administrator." };
    }

    const { error } = await supabaseAdmin.from("app_users").insert({
      auth_user_id: created.data.user.id,
      name: data.name.trim(),
      name_key: key,
      login_email: loginEmail,
      role: "user",
      permissions: [],
      full_access: false,
      status: "active",
      must_change_password: true,
      temp_password: tempPassword,
      temp_password_set_at: new Date().toISOString(),
    });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.data.user.id);
      return { ok: false as const, reason: "Could not register that name. Please contact the administrator." };
    }

    const emailed = await notifyAdminOfAccessRequest(data.name.trim(), tempPassword);
    return { ok: true as const, emailed };
  });

/** The signed-in user's profile and permissions. */
export const currentAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ADMIN_EMAIL, nameKey } = await import("@/lib/users.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string } | null)?.email ?? "";

    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("auth_user_id", context.userId)
      .maybeSingle();

    if (row) {
      await supabaseAdmin
        .from("app_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", row.id as string);
      return {
        id: row.id as string,
        name: row.name as string,
        loginEmail: row.login_email as string,
        role: row.role as "admin" | "user",
        permissions: (row.permissions ?? []) as ModuleKey[],
        fullAccess: Boolean(row.full_access),
        status: row.status as "active" | "disabled",
        mustChangePassword: Boolean(row.must_change_password),
      };
    }

    // Bootstrap: the registered owner email is always the administrator.
    if (email.toLowerCase() === ADMIN_EMAIL) {
      const inserted = await supabaseAdmin
        .from("app_users")
        .insert({
          auth_user_id: context.userId,
          name: "Administrator",
          name_key: nameKey("Administrator"),
          login_email: email,
          role: "admin",
          permissions: [],
          full_access: true,
          status: "active",
          must_change_password: false,
        })
        .select("*")
        .single();
      const r = inserted.data;
      if (r) {
        return {
          id: r.id as string,
          name: r.name as string,
          loginEmail: r.login_email as string,
          role: "admin" as const,
          permissions: [] as ModuleKey[],
          fullAccess: true,
          status: "active" as const,
          mustChangePassword: false,
        };
      }
    }
    return null;
  });

/** Admin: list every registered user. */
export const listAppUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_app_admin", { _uid: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      loginEmail: r.login_email as string,
      role: r.role as "admin" | "user",
      permissions: (r.permissions ?? []) as ModuleKey[],
      fullAccess: Boolean(r.full_access),
      status: r.status as "active" | "disabled",
      mustChangePassword: Boolean(r.must_change_password),
      createdAt: r.created_at as string,
      lastLoginAt: (r.last_login_at as string) ?? null,
      tempPassword: ((r as { temp_password?: string | null }).temp_password ?? null),
    }));
  });

/** Admin: change a user's permissions, role or status. */
export const saveAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id: string;
    permissions?: string[];
    fullAccess?: boolean;
    role?: "admin" | "user";
    status?: "active" | "disabled";
  }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_app_admin", { _uid: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const patch: Record<string, unknown> = {};
    if (data.permissions) patch["permissions"] = data.permissions;
    if (data.fullAccess !== undefined) patch["full_access"] = data.fullAccess;
    if (data.role) patch["role"] = data.role;
    if (data.status) patch["status"] = data.status;
    const { error } = await context.supabase.from("app_users").update(patch as never).eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

/** Admin: create a user directly, returning the temporary password once. */
export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; permissions?: string[]; fullAccess?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_app_admin", { _uid: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { nameKey, loginEmailFor, generateTempPassword } = await import("@/lib/users.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = nameKey(data.name);
    if (key.length < 2) throw new Error("Enter a full name");
    const loginEmail = loginEmailFor(data.name);
    const tempPassword = generateTempPassword();
    const created = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: data.name.trim() },
    });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Could not create user");
    const { error } = await supabaseAdmin.from("app_users").insert({
      auth_user_id: created.data.user.id,
      name: data.name.trim(),
      name_key: key,
      login_email: loginEmail,
      role: "user",
      permissions: data.permissions ?? [],
      full_access: Boolean(data.fullAccess),
      status: "active",
      must_change_password: true,
      temp_password: tempPassword,
      temp_password_set_at: new Date().toISOString(),
    });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.data.user.id);
      throw error;
    }
    return { ok: true as const, tempPassword };
  });

/** Admin: issue a new temporary password, shown once. */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_app_admin", { _uid: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { generateTempPassword } = await import("@/lib/users.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("auth_user_id")
      .eq("id", data.id)
      .maybeSingle();
    const authId = row?.auth_user_id as string | undefined;
    if (!authId) throw new Error("User has no login identity");
    const tempPassword = generateTempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, { password: tempPassword });
    if (error) throw error;
    await supabaseAdmin
      .from("app_users")
      .update({
        must_change_password: true,
        temp_password: tempPassword,
        temp_password_set_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    return { ok: true as const, tempPassword };
  });

/** Admin: hide a temporary password once it has been handed to the user. */
export const clearTempPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_app_admin", { _uid: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("app_users")
      .update({ temp_password: null } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
