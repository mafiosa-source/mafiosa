import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setReportUser } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  hydrateFromCloud,
  importLocalBackupToCloud,
  readLocalBackup,
  setCloudUser,
  setCurrentUserLabel,
  useFinance,
} from "@/lib/finance-store";

function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. If a confirmation email is required, check your inbox.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Alhakeem Expenses ERP
          </div>
          <h1 className="mt-2 text-xl font-semibold text-foreground">
            {mode === "signin" ? "Administrator sign in" : "Create administrator account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the same email and password on every device.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "First time here? Create the administrator account"
              : "Already have the account? Sign in"}
          </button>
        </div>
      </form>
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

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
    const userId = session?.user?.id ?? null;
    const label = session?.user?.email ?? (userId ? "Signed-in user" : null);
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
  }, [session?.user?.id]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <SignInScreen />;

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your ledger…
        </div>
      </div>
    );
  }

  return (
    <>
      <ImportBanner />
      {children}
    </>
  );
}
