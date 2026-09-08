import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { qar } from "@/lib/format";
import { duMondeLocations, salesPriceReport, useDuMonde } from "@/lib/dumonde-ops";

export function SalesPriceReport({ from, to }: { from?: string; to?: string }) {
  const s = useDuMonde();
  const locations = duMondeLocations(s);
  const [location, setLocation] = useState("all");

  const report = useMemo(
    () => salesPriceReport(s, from, to, location === "all" ? undefined : location),
    [s, from, to, location],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Actual sales as entered against correct sales calculated from the standard item price.
        </p>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Items sold" value={report.totals.qty} caption="Total quantity in the period" />
        <StatCard label="Actual sales" value={report.totals.actual} tone="info" caption="As entered on the sheets" />
        <StatCard label="Correct sales" value={report.totals.expected} tone="success" caption="Quantity x standard price" />
        <StatCard
          label="Difference"
          value={report.totals.variance}
          tone={report.totals.variance === 0 ? "info" : report.totals.variance > 0 ? "warning" : "danger"}
          caption="Correct − actual"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-20 text-right">Qty</TableHead>
              <TableHead className="w-24 text-right">Cash</TableHead>
              <TableHead className="w-24 text-right">Card</TableHead>
              <TableHead className="w-28 text-right">Std price</TableHead>
              <TableHead className="w-32 text-right">Actual sales</TableHead>
              <TableHead className="w-32 text-right">Correct sales</TableHead>
              <TableHead className="w-32 text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No sales recorded for this period.
                </TableCell>
              </TableRow>
            ) : (
              report.rows.map((r) => (
                <TableRow key={r.key} className={r.standardPrice === null ? "bg-muted/40" : undefined}>
                  <TableCell className="tabular font-medium">{r.code}</TableCell>
                  <TableCell>
                    {r.name}
                    {r.standardPrice === null ? (
                      <span className="ml-2 text-xs text-muted-foreground">not in item list</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular">{r.qty}</TableCell>
                  <TableCell className="text-right tabular">{r.cashQty || "—"}</TableCell>
                  <TableCell className="text-right tabular">{r.cardQty || "—"}</TableCell>
                  <TableCell className="text-right tabular">{r.standardPrice === null ? "—" : qar(r.standardPrice)}</TableCell>
                  <TableCell className="text-right tabular">{qar(r.actual)}</TableCell>
                  <TableCell className="text-right tabular">{r.standardPrice === null ? "—" : qar(r.expected)}</TableCell>
                  <TableCell
                    className={`text-right tabular font-medium ${
                      r.standardPrice === null || Math.abs(r.variance) < 0.005 ? "" : "text-destructive"
                    }`}
                  >
                    {r.standardPrice === null ? "—" : qar(r.variance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
