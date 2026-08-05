import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

/** One line of the breakdown behind a summary card. */
export type DrillRow = {
  /** Housemaid / candidate name — rendered as a link to the financial profile. */
  housemaid?: string;
  date?: string;
  company?: string;
  particulars?: string;
  wallet?: string;
  amount: number;
  balance?: number;
};

export type DrillColumn = "date" | "housemaid" | "company" | "particulars" | "wallet" | "amount" | "balance";

const HEADERS: Record<DrillColumn, string> = {
  date: "Date",
  housemaid: "Housemaid",
  company: "Company",
  particulars: "Particulars",
  wallet: "Wallet used",
  amount: "Amount",
  balance: "Balance",
};

/**
 * A summary card that opens the exact transactions or balances behind its total.
 * Clicking the value drills down instead of navigating away.
 */
export function DrillDownStat({
  label,
  value,
  caption,
  icon: Icon,
  tone = "default",
  format = "currency",
  title,
  description,
  columns,
  rows,
  empty = "Nothing to show yet.",
  footer,
}: {
  label: string;
  value: number | string;
  caption?: string;
  icon?: LucideIcon;
  tone?: Tone;
  format?: "currency" | "raw";
  title?: string;
  description?: string;
  columns: DrillColumn[];
  rows: DrillRow[];
  empty?: string;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const display = format === "currency" && typeof value === "number" ? qar(value) : value;
  const negative = typeof value === "number" && value < 0;
  const totalAmount = rows.reduce((a, r) => a + (r.amount || 0), 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group flex h-full w-full flex-col rounded-xl border bg-card p-5 text-left shadow-sm transition-all duration-200",
          "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          TONE_ACCENT[tone],
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
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
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
          View breakdown ({rows.length})
          <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title ?? label}</DialogTitle>
            <DialogDescription>
              {description ?? "Everything that makes up this total."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c} className={c === "amount" || c === "balance" ? "text-right" : undefined}>
                      {HEADERS[c]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      {empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={`${r.housemaid ?? ""}-${r.date ?? ""}-${i}`}>
                      {columns.map((c) => {
                        if (c === "amount" || c === "balance") {
                          const v = c === "amount" ? r.amount : (r.balance ?? 0);
                          return (
                            <TableCell key={c} className="text-right tabular font-medium">
                              {qar(v)}
                            </TableCell>
                          );
                        }
                        if (c === "housemaid") {
                          return (
                            <TableCell key={c}>
                              {r.housemaid ? (
                                <Link
                                  to="/housemaid/$name"
                                  params={{ name: r.housemaid }}
                                  className="font-medium text-primary hover:underline"
                                  onClick={() => setOpen(false)}
                                >
                                  {r.housemaid}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          );
                        }
                        const text = c === "date" ? r.date : c === "company" ? r.company : c === "wallet" ? r.wallet : r.particulars;
                        return (
                          <TableCell key={c} className={cn("text-sm", c === "date" && "whitespace-nowrap")}>
                            {text || "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
              {rows.length ? (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={columns.filter((c) => c !== "amount" && c !== "balance").length}>
                      Total
                    </TableCell>
                    <TableCell className="text-right tabular font-semibold">{qar(totalAmount)}</TableCell>
                    {columns.includes("balance") ? <TableCell /> : null}
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>
          {footer}
        </DialogContent>
      </Dialog>
    </>
  );
}
