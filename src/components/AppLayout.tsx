import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Coffee,
  CreditCard,
  UsersRound,
  HandCoins,
  Banknote,
  ArrowLeftRight,
  ReceiptText,
  ClipboardCheck,
  FileBarChart2,
  ListOrdered,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "All Transactions", icon: ListOrdered },
  { to: "/vouchers", label: "Vouchers (RV/PV)", icon: ReceiptText },
  { to: "/candidates", label: "Candidate Holdings", icon: UsersRound },
  { to: "/salaries", label: "Housemaid Salaries", icon: HandCoins },
  { to: "/sponsors", label: "Sponsor Receivables", icon: Banknote },
  { to: "/petty-cash", label: "Office Petty Cash", icon: Wallet },
  { to: "/du-monde", label: "Du Monde Petty Cash", icon: Coffee },
  { to: "/cards", label: "Company Cards", icon: CreditCard },
  { to: "/transfers", label: "CBQ Transfers", icon: ArrowLeftRight },
  { to: "/reconciliation", label: "Reconciliation", icon: ClipboardCheck },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">AHG Finance Core</div>
          <div className="mt-1 text-base font-semibold">Operations Center</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-2 border-transparent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
          Phase 1 · Master ledger · Local
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
