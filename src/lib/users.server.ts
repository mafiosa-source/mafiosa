// Server-only helpers for the multi-user access layer.
export const ADMIN_EMAIL = "m.aconsultingqatar@gmail.com";

export function nameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Generates a placeholder login email for name-based user creation. */
export function loginEmailFor(name: string) {
  const slug =
    nameKey(name)
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "user";
  return `${slug}@alhakeemgroup.app`;
}

export function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Notifies the administrator about a new access request and its temporary
 * password. Returns false (without throwing) when email sending is not
 * configured yet — the password is then shown in the Admin panel instead.
 */
export async function notifyAdminOfAccessRequest(name: string, tempPassword: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return false;
  const from = process.env["EMAIL_FROM"] || "Alhakeem Group ERP <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [ADMIN_EMAIL],
        subject: `ERP access request — ${name}`,
        html:
          `<p><strong>${name}</strong> requested access to Alhakeem Group ERP.</p>` +
          `<p>Temporary password: <strong>${tempPassword}</strong></p>` +
          `<p>Give this password to ${name}. Then open <em>Admin → User Management</em> and choose which modules they may access. Until you do, they can sign in but see no modules.</p>`,
      }),
    });
    if (!res.ok) {
      console.error("[access-request] email send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[access-request] email send error", e);
    return false;
  }
}
