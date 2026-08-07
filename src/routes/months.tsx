import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, Unlock } from "lucide-react";
import { useFinance, reopenMonth } from "@/lib/finance-store";
import { ledgerYears, monthsOfYear } from "@/lib/finance-derived";
import { MonthCloseDialog } from "@/components/MonthCloseDialog";
import { qar } from "@/lib/format";
import type { MonthStatus } from "@/lib/finance-types";
import { toast } from "sonner";

export const Route = createFileRoute("/months")({
  head: () => ({
    meta: [
      { title: "Month Management · Alhakeem Expenses ERP" },
      { name: "description", content: "Every financial year organised by month, with manual reconciliation and closing." },
      { property: "og:title", content: "Month Management · Alhakeem Expenses ERP" },
      { property: "og:description", content: "Open, ready-to-close and closed months with full reconciliation history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonthsPage,
});

const STATUS_UI: Record<MonthStatus, { className: string; icon: typeof CheckCircle2; label: string }> = {
  Closed: { className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2, label: "Closed" },
  "Ready to Close": { className: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock, label: "Ready to Close" },
  Open: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle, label: "Open" },
};

function MonthsPage() {
  const s = useFinance();
  const years = useMemo(() => ledgerYears(s), [s]);
  const [expanded, setExpanded] = useState<number | null>(years[0] ?? new Date().getFullYear());

  return (
    <AppLayout>
      <PageHeader
        title="Month Management"
        description="Records are organised by year and month. Nothing is ever deleted — closed months stay fully searchable."
      />

      <div className="space-y-6">
        {years.map((year) => {
          const months = monthsOfYear(s, year);
          const open = expanded === year;
          return (
            <Card key={year}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <button type="button" className="font-semibold" onClick={() => setExpanded(open ? null : year)}>
                    {year}
                  </button>
                  <span className="text-xs font-normal text-muted-foreground">
                    {months.filter((m) => m.status === "Closed").length} closed ·{" "}
                    {months.filter((m) => m.count > 0 && m.status !== "Closed").length} open
                  </span>
                </CardTitle>
              </CardHeader>
              {open && (
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {months.map((m) => {
                    const ui = STATUS_UI[m.status];
                    const Icon = ui.icon;
                    return (
                      <div key={m.month} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Link
                            to="/months/$year/$month"
                            params={{ year: String(year), month: String(m.month) }}
                            className="font-medium hover:underline"
                          >
                            {m.label}
                          </Link>
                          <Badge variant="outline" className={ui.className}>
                            <Icon className="h-3 w-3" /> {ui.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>{m.count} txns</span>
                          <span className="tabular">Out {qar(m.expenses)}</span>
                        </div>
                        <div className="flex gap-2">
                          <MonthCloseDialog
                            year={year}
                            month={m.month}
                            trigger={
                              <Button size="sm" variant={m.status === "Ready to Close" ? "default" : "outline"} className="h-7 text-xs">
                                {m.status === "Closed" ? "Reconciliation" : "Close Month"}
                              </Button>
                            }
                          />
                          {m.status === "Closed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                reopenMonth(year, m.month);
                                toast.success(`${m.label} ${year} re-opened`, {
                                  description: "The closing record is kept for audit history.",
                                });
                              }}
                            >
                              <Unlock className="h-3 w-3" /> Re-open
                            </Button>
                          )}
                        </div>
                        {m.closing?.closedWithExceptions && m.closing.status === "Closed" && (
                          <p className="text-xs text-amber-600">
                            Closed with {m.closing.exceptions.length} exception(s).
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
