import { useMemo } from "react";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qar } from "@/lib/format";
import { duMondeSummary, useDuMonde } from "@/lib/dumonde-ops";

export function OpsDashboard({ from, to }: { from?: string; to?: string }) {
  const s = useDuMonde();
  const { rows, totals } = useMemo(() => duMondeSummary(s, from, to), [s, from, to]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Money In (sales)" value={totals.moneyIn} tone="success" caption="Sales entered for this period" />
        <StatCard label="Money Out (costs)" value={totals.moneyOut} tone="warning" caption="LPO items and other expenses" />
        <StatCard
          label="Profit / Loss"
          value={totals.profit}
          tone={totals.profit < 0 ? "danger" : "info"}
          caption="Sales − costs"
        />
        <StatCard
          label="Bank money in"
          value={totals.bankIn}
          caption={`Difference vs sales: ${qar(totals.variance)}`}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-3 text-sm font-medium">Per location</div>
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
                  <TableRow key={r.location}>
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
    </div>
  );
}
