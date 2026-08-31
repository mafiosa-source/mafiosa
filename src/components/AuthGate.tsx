import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setReportUser } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { currentAppUser, requestAccess, resolveLogin } from "@/lib/users.functions";
import { AppUserProvider } from "@/lib/app-user";
import type { AppUser } from "@/lib/permissions";
import {
  hydrateFromCloud,
  importLocalBackupToCloud,
  readLocalBackup,
  setCloudUser,
  setCurrentUserLabel,
  useFinance,
} from "@/lib/finance-store";

/** Name-first sign in. The name is mapped internally to a login identity. */
function SignInScreen() {
  const lookup = useServerFn(resolveLogin);
  const askAccess = useServerFn(requestAccess);

  const [step, setStep] = useState<"name" | "password" | "requested">("name");
  const [name, setName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [unknownName, setUnknownName] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setUnknownName(false);
    try {
      // An email typed here signs in directly (administrator account).
      if (name.includes("@")) {
        setLoginEmail(name.trim());
        setStep("password");
        return;
      }
      const res = await lookup({ data: { name } });
      if (!res.found) {
        setUnknownName(true);
        return;
      }
      if (res.disabled) {
        toast.error("This account is disabled. Please contact the administrator.");
        return;
      }
      setLoginEmail(res.loginEmail);
      setStep("password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check that name");
    } finally {
      setBusy(false);
    }
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRequest() {
    setBusy(true);
    try {
      const res = await askAccess({ data: { name } });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      setStep("requested");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Alhakeem Group ERP
          </div>
          <h1 className="mt-2 text-xl font-semibold text-foreground">
            {step === "requested" ? "Access requested" : step === "password" ? `Welcome, ${name}` : "Enter your name"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "requested"
              ? "The administrator has your request. You will be given a temporary password."
              : step === "password"
                ? "Enter the password you were given."
                : "Sign in with your name. New here? We will ask the administrator for access."}
          </p>
        </div>

        {step === "name" && (
          <form onSubmit={onName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                autoComplete="username"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setUnknownName(false);
                }}
              />
            </div>
            {unknownName ? (
              <div className="rounded-md border border-border bg-accent/40 p-3 text-sm">
                <p>
                  <strong>{name.trim()}</strong> is not registered yet.
                </p>
                <Button type="button" size="sm" className="mt-2 w-full" onClick={onRequest} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request access"}
                </Button>
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            )}
          </form>
        )}

        {step === "password" && (
          <form onSubmit={onPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep("name");
                setPassword("");
              }}
            >
              <ArrowLeft className="h-3 w-3" /> Use a different name
            </button>
          </form>
        )}

        {step === "requested" && (
          <div className="space-y-4 text-sm">
            <p className="rounded-md border border-border bg-accent/40 p-3">
              Your request was recorded. The administrator will give you a temporary password, then you can sign in
              with your name.
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setStep("name");
                setUnknownName(false);
              }}
            >
              Back to sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportBanner() {
  const { transactions } = useFinance();
  const [localCount, setLocalCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLocalCount(readLocalBackup().length);
  }, []);

  if (dismissed || localCount === 0 || transactions.length > 0) return null;

  async function runImport() {
    setBusy(true);
    try {
      const n = await importLocalBackupToCloud();
      toast.success(`Uploaded ${n} records to the database. Your browser copy was kept as a backup.`);
      setDismissed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border bg-accent/40 px-6 py-3 text-sm">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <span>
          <strong>{localCount}</strong> records were found in this browser and are not in the database yet.
          Nothing is deleted — your local copy stays as a backup.
        </span>
        <div className="flex gap-2">
          <Button size="sm" onClick={runImport} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload to database"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

function NoAccessScreen({ name }: { name: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-sm shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Waiting for access</h1>
        <p className="mt-2 text-muted-foreground">
          {name ? `${name}, your` : "Your"} account is signed in but no modules have been assigned yet. The
          administrator must grant your permissions in Admin → Users.
        </p>
        <Button
          className="mt-4 w-full"
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const loadProfile = useServerFn(currentAppUser);

  const refreshProfile = useCallback(() => {
    loadProfile({ data: undefined as never })
      .then((u) => {
        setAppUser((u as AppUser | null) ?? null);
        setProfileChecked(true);
      })
      .catch(() => setProfileChecked(true));
  }, [loadProfile]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setChecked(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setAppUser(null);
      setProfileChecked(false);
      return;
    }
    setProfileChecked(false);
    refreshProfile();
  }, [session?.user?.id, refreshProfile]);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    const label = appUser?.name ?? session?.user?.email ?? (userId ? "Signed-in user" : null);
    setCloudUser(userId);
    setCurrentUserLabel(label);
    setReportUser(label);
    if (!userId) {
      setLoaded(false);
      return;
    }
    let active = true;
    hydrateFromCloud()
      .then(() => active && setLoaded(true))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load your data");
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, appUser?.name]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <SignInScreen />;

  if (!loaded || !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your ledger…
        </div>
      </div>
    );
  }

  const hasAnyAccess =
    !!appUser &&
    appUser.status === "active" &&
    (appUser.role === "admin" || appUser.fullAccess || appUser.permissions.length > 0);

  if (!hasAnyAccess) {
    return <NoAccessScreen name={appUser?.name ?? ""} />;
  }

  return (
    <AppUserProvider user={appUser} refresh={refreshProfile}>
      <ImportBanner />
      {children}
    </AppUserProvider>
  );
}
