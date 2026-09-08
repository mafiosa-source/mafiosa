import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qar } from "@/lib/format";

export type DuMondeEntryLine = {
  name: string;
  code?: string;
  qty: number;
  cashQty?: number;
  cardQty?: number;
  availableQty?: number;
  unit?: string;
  unitPrice: number;
  total: number;
};

export type DuMondeEntry = {
  kind: "LPO" | "Sales" | "Expense" | "Bank line";
  date: string;
  location?: string;
  category?: string;
  notes?: string;
  total: number;
  lines?: DuMondeEntryLine[];
};

/** Read-only summary of a single Du Monde entry, opened by clicking its row. */
export function DuMondeEntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: DuMondeEntry | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!entry) return null;
  const isSales = entry.kind === "Sales";
  const isLpo = entry.kind === "LPO";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {entry.kind} · {entry.date}
          </DialogTitle>
          <DialogDescription>Everything recorded in this entry.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Date</div>
            <div className="tabular">{entry.date}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Location</div>
            <div>{entry.location || "—"}</div>
          </div>
          {entry.category ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Category</div>
              <div>{entry.category}</div>
            </div>
          ) : null}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Amount</div>
            <div className="tabular font-semibold">{qar(entry.total)}</div>
          </div>
          {entry.notes ? (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Notes</div>
              <div className="text-muted-foreground">{entry.notes}</div>
            </div>
          ) : null}
        </div>

        {entry.lines?.length ? (
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSales ? <TableHead>Code</TableHead> : null}
                  <TableHead>Item</TableHead>
                  {isLpo ? <TableHead className="text-right">Available</TableHead> : null}
                  {isSales ? <TableHead className="text-right">Cash</TableHead> : null}
                  {isSales ? <TableHead className="text-right">Card</TableHead> : null}
                  <TableHead className="text-right">{isLpo ? "Order qty" : "Qty"}</TableHead>
                  <TableHead className="text-right">{isLpo ? "Unit cost" : "Unit price"}</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((l, i) => (
                  <TableRow key={`${l.name}-${i}`}>
                    {isSales ? <TableCell className="font-mono text-xs">{l.code || "—"}</TableCell> : null}
                    <TableCell>{l.name}</TableCell>
                    {isLpo ? <TableCell className="text-right tabular">{l.availableQty ?? 0}</TableCell> : null}
                    {isSales ? <TableCell className="text-right tabular">{l.cashQty ?? 0}</TableCell> : null}
                    {isSales ? <TableCell className="text-right tabular">{l.cardQty ?? 0}</TableCell> : null}
                    <TableCell className="text-right tabular">
                      {l.qty}
                      {l.unit ? ` ${l.unit}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular">{qar(l.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular font-medium">{qar(l.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={isSales ? 6 : isLpo ? 4 : 3}>Total</TableCell>
                  <TableCell className="text-right tabular font-semibold">{qar(entry.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
