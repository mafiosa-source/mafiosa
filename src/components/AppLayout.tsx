import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Fuel,
  LayoutDashboard,
  Wallet,
  Coffee,
  CreditCard,
  UsersRound,
  HandCoins,
  PiggyBank,
  Banknote,
  ArrowLeftRight,
  ReceiptText,
  ClipboardCheck,
  FileBarChart2,
  ListOrdered,
  CalendarRange,
  LogOut,
  ChevronDown,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const topLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "All Transactions", icon: ListOrdered },
] as const;

const groups = [
  {
    label: "Cash, Bank & Cards",
    items: [
      { to: "/petty-cash", label: "Office Petty Cash", icon: Wallet },
      { to: "/du-monde", label: "Du Monde Petty Cash", icon: Coffee },
      { to: "/cards", label: "Company Cards", icon: CreditCard },
      { to: "/transfers", label: "CBQ Transfers", icon: ArrowLeftRight },
      { to: "/fuel", label: "Fuel & Vehicles", icon: Fuel },
    ],
  },
  {
    label: "Held Funds & People",
    items: [
      { to: "/candidates", label: "Candidate Holdings", icon: UsersRound },
      { to: "/salaries", label: "Housemaid Salaries", icon: HandCoins },
      { to: "/holding-wallet", label: "Housemaid Holding Wallet", icon: PiggyBank },
      { to: "/sponsors", label: "Sponsor Receivables", icon: Banknote },
    ],
  },
  {
    label: "Vouchers, Closing & Reports",
    items: [
      { to: "/vouchers", label: "Vouchers (RV/PV)", icon: ReceiptText },
      { to: "/reconciliation", label: "Reconciliation", icon: ClipboardCheck },
      { to: "/months", label: "Month Management", icon: CalendarRange },
      { to: "/reports", label: "Reports", icon: FileBarChart2 },
    ],
  },
] as const;

const isActivePath = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname.startsWith(to);

function NavLink({ to, label, icon: Icon, active, nested }: { to: string; label: string; icon: typeof Wallet; active: boolean; nested?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 py-2.5 text-sm transition-colors border-l-2",
        nested ? "pl-8 pr-5" : "px-5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-primary"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-transparent",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: readonly { to: string; label: string; icon: typeof Wallet }[];
  pathname: string;
}) {
  const hasActive = items.some((i) => isActivePath(pathname, i.to));
  const [open, setOpen] = useState(hasActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-5 py-2.5 text-xs uppercase tracking-wide transition-colors",
          hasActive ? "text-sidebar-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
        )}
      >
        <span className="text-left">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open ? "" : "-rotate-90")} />
      </button>
      {open && (
        <div className="pb-1">
          {items.map((item) => (
            <NavLink key={item.to} {...item} nested active={isActivePath(pathname, item.to)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">Alhakeem Expenses ERP</div>
          <div className="mt-1 text-base font-semibold">Operations Center</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-1">
          {topLinks.map((item) => (
            <NavLink key={item.to} {...item} active={isActivePath(pathname, item.to)} />
          ))}
          <div className="my-2 border-t border-sidebar-border" />
          {groups.map((g) => (
            <NavGroup key={g.label} label={g.label} items={g.items} pathname={pathname} />
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
          <div>Phase 1 · Master ledger · Cloud database</div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="mt-2 flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1400px] px-6 py-6">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}


export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
