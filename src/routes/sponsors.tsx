import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { addSponsor, deleteSponsor, useFinance } from "@/lib/finance-store";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsor Receivables · Finance Control" },
      { name: "description", content: "Track sponsor deposits and outstanding balances." },
    ],
  }),
  component: SponsorsPage,
});

function SponsorsPage() {
  const s = useFinance();
  const totalAgreed = s.sponsors.reduce((a, r) => a + r.totalAmount, 0);
  const totalDeposit = s.sponsors.reduce((a, r) => a + r.deposit, 0);
  const outstanding = Math.max(0, totalAgreed - totalDeposit);

  return (
    <AppLayout>
      <PageHeader
        title="Sponsor Receivables"
        description="Deposits received and balances remaining after arrival."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv("sponsor-receivables.csv", s.sponsors)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <FormDialog
              title="New sponsor receivable"
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> New receivable</Button>}
              onSubmit={(fd) => {
                addSponsor({
                  sponsor: String(fd.get("sponsor") || ""),
                  candidate: String(fd.get("candidate") || ""),
                  totalAmount: Number(fd.get("totalAmount") || 0),
                  deposit: Number(fd.get("deposit") || 0),
                  depositDate: String(fd.get("depositDate") || "") || undefined,
                  paymentMethod: String(fd.get("paymentMethod") || "") || undefined,
                  notes: String(fd.get("notes") || "") || undefined,
                });
                toast.success("Receivable added");
              }}
            >
              <Field label="Sponsor name" name="sponsor" required />
              <Field label="Candidate" name="candidate" required />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Total agreed (QAR)" name="totalAmount" type="number" step="0.01" required />
                <Field label="Deposit received" name="deposit" type="number" step="0.01" required />
              </div>
              <Field label="Deposit date" name="depositDate" type="date" defaultValue={today()} />
              <Field label="Payment method" name="paymentMethod" />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Agreed" value={totalAgreed} />
        <StatCard label="Deposits Received" value={totalDeposit} tone="success" />
        <StatCard label="Outstanding" value={outstanding} tone="danger" />
        <StatCard label="Active Records" value={s.sponsors.length} format="raw" />
      </div>

      <DataTable
        rows={s.sponsors}
        columns={[
          { key: "sponsor", header: "Sponsor", render: (r) => r.sponsor },
          { key: "candidate", header: "Candidate", render: (r) => r.candidate },
          { key: "total", header: "Total", className: "text-right", render: (r) => <span className="tabular">{qar(r.totalAmount)}</span> },
          { key: "dep", header: "Deposit", className: "text-right", render: (r) => <span className="tabular text-[color:var(--success)]">{qar(r.deposit)}</span> },
          { key: "bal", header: "Balance", className: "text-right", render: (r) => <span className="tabular font-semibold">{qar(Math.max(0, r.totalAmount - r.deposit))}</span> },
          { key: "date", header: "Deposit date", render: (r) => r.depositDate || "—" },
          { key: "pm", header: "Method", render: (r) => r.paymentMethod || "—" },
          { key: "act", header: "", render: (r) => <Button size="icon" variant="ghost" onClick={() => deleteSponsor(r.id)}><Trash2 className="h-4 w-4" /></Button> },
        ]}
      />
    </AppLayout>
  );
}
