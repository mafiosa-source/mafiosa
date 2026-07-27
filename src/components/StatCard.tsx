import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { qar } from "@/lib/format";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  format = "currency",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  format?: "currency" | "raw";
}) {
  const toneClasses = {
    default: "border-border",
    success: "border-l-4 border-l-[color:var(--success)]",
    warning: "border-l-4 border-l-[color:var(--warning)]",
    danger: "border-l-4 border-l-[color:var(--destructive)]",
    info: "border-l-4 border-l-[color:var(--info)]",
  }[tone];
  return (
    <div className={cn("rounded-lg border bg-card p-5 shadow-sm", toneClasses)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground tabular">
        {format === "currency" && typeof value === "number" ? qar(value) : value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
