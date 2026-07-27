import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addTransfer, deleteTransfer, useFinance, pendingTransferToCBQ } from "@/lib/finance-store";
import { COMPANIES } from "@/lib/finance-types";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/transfers")({
  head: () => ({
    meta: [
      { title: "CBQ Transfer Control · Finance Control" },
      { name: "description", content: "Track transfers from company accounts to CBQ." },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  const s = useFinance();
  const pending = pendingTransferToCBQ(s);
  const received = s.transfers.reduce((a, t) => a + t.amountReceived, 0);
  const transferred = s.transfers.reduce((a, t) => a + t.amountTransferred, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Company → CBQ Transfer Control"
        description="Track money received into company accounts and pending transfers to CBQ."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv("cbq-transfers.csv", s.transfers)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <FormDialog
              title="New transfer record"
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> New record</Button>}
              onSubmit={(fd) => {
                addTransfer({
                  date: String(fd.get("date") || today()),
                  company: fd.get("company") as never,
                  amountReceived: Number(fd.get("amountReceived") || 0),
                  purpose: String(fd.get("purpose") || ""),
                  amountTransferred: Number(fd.get("amountTransferred") || 0),
                  transferDate: String(fd.get("transferDate") || "") || undefined,
                });
                toast.success("Transfer record added");
              }}
            >
              <Field label="Date received" name="date" type="date" required defaultValue={today()} />
              <SelectField label="Company" name="company" options={COMPANIES} required />
              <Field label="Amount received (QAR)" name="amountReceived" type="number" step="0.01" required />
              <Field label="Purpose" name="purpose" required />
              <Field label="Amount transferred to CBQ" name="amountTransferred" type="number" step="0.01" defaultValue={0} />
              <Field label="Transfer date" name="transferDate" type="date" />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Received (all companies)" value={received} />
        <StatCard label="Transferred to CBQ" value={transferred} tone="success" />
        <StatCard label="Required to Transfer" value={pending} tone="danger" />
        <StatCard label="Records" value={s.transfers.length} format="raw" />
      </div>

      <DataTable
        rows={s.transfers}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          { key: "co", header: "Company", render: (r) => <Badge variant="outline">{r.company}</Badge> },
          { key: "purpose", header: "Purpose", render: (r) => r.purpose },
          { key: "rec", header: "Received", className: "text-right", render: (r) => <span className="tabular">{qar(r.amountReceived)}</span> },
          { key: "tra", header: "Transferred", className: "text-right", render: (r) => <span className="tabular text-[color:var(--success)]">{qar(r.amountTransferred)}</span> },
          { key: "pen", header: "Pending", className: "text-right", render: (r) => {
            const p = Math.max(0, r.amountReceived - r.amountTransferred);
            return <span className={"tabular font-semibold " + (p > 0 ? "text-[color:var(--destructive)]" : "")}>{qar(p)}</span>;
          } },
          { key: "tdate", header: "Transfer date", render: (r) => r.transferDate || "—" },
          { key: "act", header: "", render: (r) => <Button size="icon" variant="ghost" onClick={() => deleteTransfer(r.id)}><Trash2 className="h-4 w-4" /></Button> },
        ]}
      />
    </AppLayout>
  );
}
