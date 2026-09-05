// Module permissions for the multi-user access layer.
// Purely additive: existing finance logic is untouched.

export type ModuleKey =
  | "dashboard"
  | "transactions"
  | "petty-cash"
  | "du-monde"
  | "cards"
  | "transfers"
  | "fuel"
  | "candidates"
  | "salaries"
  | "holding-wallet"
  | "sponsors"
  | "vouchers"
  | "reconciliation"
  | "months"
  | "reports"
  | "workers"
  | "agents";

export const MODULES: { key: ModuleKey; label: string; group: string }[] = [
  { key: "dashboard", label: "Dashboard", group: "General" },
  { key: "transactions", label: "All Transactions", group: "General" },
  { key: "petty-cash", label: "Office Petty Cash", group: "Cash, Bank & Cards" },
  { key: "du-monde", label: "Du Monde Petty Cash", group: "Cash, Bank & Cards" },
  { key: "cards", label: "Company Cards", group: "Cash, Bank & Cards" },
  { key: "transfers", label: "CBQ Transfers", group: "Cash, Bank & Cards" },
  { key: "fuel", label: "Fuel & Vehicles", group: "Cash, Bank & Cards" },
  { key: "candidates", label: "Candidate Holdings", group: "Held Funds & People" },
  { key: "salaries", label: "Housemaid Salaries", group: "Held Funds & People" },
  { key: "holding-wallet", label: "Housemaid Holding Wallet", group: "Held Funds & People" },
  { key: "sponsors", label: "Sponsor Receivables", group: "Held Funds & People" },
  { key: "vouchers", label: "Vouchers (RV/PV)", group: "Vouchers, Closing & Reports" },
  { key: "reconciliation", label: "Reconciliation", group: "Vouchers, Closing & Reports" },
  { key: "months", label: "Month Management", group: "Vouchers, Closing & Reports" },
  { key: "reports", label: "Reports", group: "Vouchers, Closing & Reports" },
  { key: "workers", label: "CV / Workers", group: "CV Management" },
  { key: "agents", label: "Agents", group: "CV Management" },
];

export const MODULE_LABEL: Record<string, string> = MODULES.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.label }),
  {} as Record<string, string>,
);

/** Route path → module that guards it. Longest prefix wins. */
const ROUTE_MODULES: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/transactions", module: "transactions" },
  { prefix: "/petty-cash", module: "petty-cash" },
  { prefix: "/du-monde", module: "du-monde" },
  { prefix: "/cards", module: "cards" },
  { prefix: "/transfers", module: "transfers" },
  { prefix: "/fuel", module: "fuel" },
  { prefix: "/candidates", module: "candidates" },
  { prefix: "/salaries", module: "salaries" },
  { prefix: "/housemaid", module: "salaries" },
  { prefix: "/holding-wallet", module: "holding-wallet" },
  { prefix: "/sponsors", module: "sponsors" },
  { prefix: "/vouchers", module: "vouchers" },
  { prefix: "/reconciliation", module: "reconciliation" },
  { prefix: "/months", module: "months" },
  { prefix: "/reports", module: "reports" },
  { prefix: "/workers", module: "workers" },
  { prefix: "/agents", module: "agents" },
];

/** Routes that only the administrator may open. */
export const ADMIN_ROUTES = ["/admin/users", "/admin/activity"];

export function moduleForPath(pathname: string): ModuleKey | "admin" | null {
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) return "admin";
  if (pathname === "/") return "dashboard";
  const hit = ROUTE_MODULES.filter((r) => pathname.startsWith(r.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
  return hit ? hit.module : null;
}

export type AppUser = {
  id: string;
  name: string;
  loginEmail: string;
  role: "admin" | "user";
  permissions: ModuleKey[];
  fullAccess: boolean;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
};

export function canAccess(user: AppUser | null, module: ModuleKey | "admin" | null): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  if (user.role === "admin" || user.fullAccess) return true;
  if (module === "admin") return false;
  if (!module) return true; // unmapped utility routes stay reachable
  return user.permissions.includes(module);
}
