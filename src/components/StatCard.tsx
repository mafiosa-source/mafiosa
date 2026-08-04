import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

// Dashboard cards link to many static routes; loosen the generic route typing.
const NavLink = Link as unknown as React.ComponentType<Record<string, unknown>>;
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { qar } from "@/lib/format";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONE_ACCENT: Record<Tone, string> = {
  default: "",
  success: "border-l-4 border-l-[color:var(--success)]",
  warning: "border-l-4 border-l-[color:var(--warning)]",
  danger: "border-l-4 border-l-[color:var(--destructive)]",
  info: "border-l-4 border-l-[color:var(--info)]",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  format = "currency",
  to,
  search,
  cta = "View details",
  caption = "Current balance",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  format?: "currency" | "raw";
  /** When provided the whole card becomes a link into that module. */
  to?: string;
  search?: Record<string, string>;
  cta?: string;
  caption?: string;
}) {
  const display = format === "currency" && typeof value === "number" ? qar(value) : value;
  const negative = typeof value === "number" && value < 0;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {caption ? <div className="mt-0.5 text-[11px] text-muted-foreground/70">{caption}</div> : null}
        </div>
        {Icon ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-3 text-2xl font-semibold tabular tracking-tight",
          negative ? "text-[color:var(--destructive)]" : "text-foreground",
        )}
      >
        {display}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}

      {to ? (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      ) : null}
    </>
  );

  const base = cn(
    "group flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-200",
    TONE_ACCENT[tone],
  );

  if (!to) return <div className={base}>{body}</div>;

  return (
    <NavLink
      to={to}
      search={search}
      className={cn(
        base,
        "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {body}
    </NavLink>
  );
}
