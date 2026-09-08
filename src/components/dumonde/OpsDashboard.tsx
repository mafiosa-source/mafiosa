import { useMemo, useState } from "react";
import { DrillDownStat, type DrillRow } from "@/components/DrillDownStat";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qar } from "@/lib/format";
import { duMondeSummary, inPeriod, useDuMonde } from "@/lib/dumonde-ops";
import { DuMondeEntryDialog, type DuMondeEntry } from "./DuMondeEntryDialog";

export function OpsDashboard({ from, to }: { from?: string; to?: string }) {
  const s = useDuMonde();
  const { rows, totals } = useMemo(() => duMondeSummary(s, from, to), [s, from, to]);

  const [location, setLocation] = useState<string | null>(null);
  const [entry, setEntry] = useState<DuMondeEntry | null>(null);

  const salesRows = useMemo(
    () =>
      s.sales
        .filter((x) => inPeriod(x.date, from, to))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [s.sales, from, to],
  );
  const expenseRows = useMemo(
    () =>
      s.expenses
        .filter((x) => inPeriod(x.date, from, to))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [s.expenses, from, to],
  );
  const bankRows = useMemo(
    () =>
      s.statements
        .flatMap((st) => st.lines)
        .filter((l) => l.direction === "in" && inPeriod(l.date, from, to))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [s.statements, from, to],
  );

  const saleEntry = (x: (typeof salesRows)[number]): DuMondeEntry => ({
    kind: "Sales",
    date: x.date,
    location: x.location,
    notes: x.notes,
    total: x.total,
    lines: x.items.map((i) => ({
      name: i.name,
      code: i.itemCode,
      qty: i.qty,
      cashQty: i.cashQty,
      cardQty: i.cardQty,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
  });

  const expenseEntry = (x: (typeof expenseRows)[number]): DuMondeEntry => ({
    kind: "Expense",
    date: x.date,
    location: x.location,
    category: x.category,
    notes: x.particulars,
    total: x.amount,
  });

  const salesDrill: DrillRow[] = salesRows.map((x) => ({
    date: x.date,
    company: x.location,
    particulars: x.items.map((i) => `${i.name} x${i.qty}`).join(", ") || x.notes || "Sales entry",
    amount: x.total,
  }));
  const expenseDrill: DrillRow[] = expenseRows.map((x) => ({
    date: x.date,
    company: x.location,
    particulars: [x.category, x.particulars].filter(Boolean).join(" · "),
    amount: x.amount,
  }));
  const bankDrill: DrillRow[] = bankRows.map((l) => ({
    date: l.date,
    company: l.location || "—",
    particulars: l.description || "Bank credit",
    amount: l.amount,
  }));
  const profitDrill: DrillRow[] = rows.map((r) => ({
    company: r.location,
    particulars: `Sales ${qar(r.moneyIn)} − costs ${qar(r.moneyOut)}`,
    amount: r.profit,
  }));

  const locSales = location ? salesRows.filter((x) => x.location === location) : [];
  const locExpenses = location ? expenseRows.filter((x) => x.location === location) : [];
  const locBank = location ? bankRows.filter((l) => (l.location ?? "") === location) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DrillDownStat
          label="Money In (sales)"
          value={totals.moneyIn}
          tone="success"
          caption="Sales entered for this period"
          title="Money In — sales entries"
          columns={["date", "company", "particulars", "amount"]}
          rows={salesDrill}
          empty="No sales entered in this period."
        />
        <DrillDownStat
          label="Money Out (costs)"
          value={totals.moneyOut}
          tone="warning"
          caption="LPO items and other expenses"
          title="Money Out — costs"
          columns={["date", "company", "particulars", "amount"]}
          rows={expenseDrill}
          empty="No costs recorded in this period."
        />
        <DrillDownStat
          label="Profit / Loss"
          value={totals.profit}
          tone={totals.profit < 0 ? "danger" : "info"}
          caption="Sales − costs"
          title="Profit / loss per location"
          columns={["company", "particulars", "amount"]}
          rows={profitDrill}
          empty="Nothing recorded in this period."
        />
        <DrillDownStat
          label="Bank money in"
          value={totals.bankIn}
          caption={`Difference vs sales: ${qar(totals.variance)}`}
          title="Bank credits in this period"
          columns={["date", "company", "particulars", "amount"]}
          rows={bankDrill}
          empty="No bank credits in this period."
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-3 text-sm font-medium">Per location — click a row for the detail</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Money In</TableHead>
              <TableHead className="text-right">Money Out</TableHead>
              <TableHead className="text-right">Profit / Loss</TableHead>
              <TableHead className="text-right">Bank In</TableHead>
              <TableHead className="text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nothing recorded for this period yet. Start with an LPO or a sales entry.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((r) => (
                  <TableRow
                    key={r.location}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setLocation(r.location)}
                  >
                    <TableCell className="font-medium">{r.location}</TableCell>
                    <TableCell className="text-right tabular">{qar(r.moneyIn)}</TableCell>
                    <TableCell className="text-right tabular">{qar(r.moneyOut)}</TableCell>
                    <TableCell className="text-right tabular font-medium">{qar(r.profit)}</TableCell>
                    <TableCell className="text-right tabular text-muted-foreground">{qar(r.bankIn)}</TableCell>
                    <TableCell className="text-right tabular text-muted-foreground">{qar(r.variance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular">{qar(totals.moneyIn)}</TableCell>
                  <TableCell className="text-right tabular">{qar(totals.moneyOut)}</TableCell>
                  <TableCell className="text-right tabular">{qar(totals.profit)}</TableCell>
                  <TableCell className="text-right tabular">{qar(totals.bankIn)}</TableCell>
                  <TableCell className="text-right tabular">{qar(totals.variance)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!location} onOpenChange={(v) => { if (!v) setLocation(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{location}</DialogTitle>
            <DialogDescription>Every entry behind this location's totals. Click a line for its full detail.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-auto">
            <Section title="Sales (money in)">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locSales.length === 0 ? (
                    <Empty cols={3} text="No sales." />
                  ) : (
                    locSales.map((x) => (
                      <TableRow
                        key={x.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEntry(saleEntry(x))}
                      >
                        <TableCell className="tabular whitespace-nowrap">{x.date}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-muted-foreground">
                          {x.items.map((i) => `${i.name} x${i.qty}`).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular font-medium">{qar(x.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Total sales</TableCell>
                    <TableCell className="text-right tabular font-semibold">
                      {qar(locSales.reduce((n, x) => n + x.total, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Section>

            <Section title="Costs (money out)">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locExpenses.length === 0 ? (
                    <Empty cols={3} text="No costs." />
                  ) : (
                    locExpenses.map((x) => (
                      <TableRow
                        key={x.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEntry(expenseEntry(x))}
                      >
                        <TableCell className="tabular whitespace-nowrap">{x.date}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {[x.category, x.particulars].filter(Boolean).join(" · ")}
                        </TableCell>
                        <TableCell className="text-right tabular font-medium">{qar(x.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Total costs</TableCell>
                    <TableCell className="text-right tabular font-semibold">
                      {qar(locExpenses.reduce((n, x) => n + x.amount, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Section>

            <Section title="Bank money in">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locBank.length === 0 ? (
                    <Empty cols={3} text="No bank credits." />
                  ) : (
                    locBank.map((l, i) => (
                      <TableRow key={l.id ?? `${l.date}-${i}`}>
                        <TableCell className="tabular whitespace-nowrap">{l.date}</TableCell>
                        <TableCell className="text-muted-foreground">{l.description || "Bank credit"}</TableCell>
                        <TableCell className="text-right tabular font-medium">{qar(l.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Total bank in</TableCell>
                    <TableCell className="text-right tabular font-semibold">
                      {qar(locBank.reduce((n, l) => n + l.amount, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Section>
          </div>
        </DialogContent>
      </Dialog>

      <DuMondeEntryDialog entry={entry} open={!!entry} onOpenChange={(v) => { if (!v) setEntry(null); }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/30 p-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}
