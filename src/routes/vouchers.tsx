import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addVoucher, deleteVoucher, useFinance } from "@/lib/finance-store";
import { COMPANIES } from "@/lib/finance-types";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vouchers")({
  head: () => ({
    meta: [
      { title: "Vouchers (RV / PV) · Finance Control" },
      { name: "description", content: "Digital receipt and payment vouchers." },
    ],
  }),
  component: VouchersPage,
});

const PAYMENT_METHODS = ["Cash", "CBQ", "Card", "Company account", "Cheque"];

function VouchersPage() {
  const s = useFinance();
  const rv = s.vouchers.filter((v) => v.type === "RV");
  const pv = s.vouchers.filter((v) => v.type === "PV");

  return (
    <AppLayout>
      <PageHeader title="Vouchers" description="Receipt Vouchers (RV) and Payment Vouchers (PV)." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Received (RV)" value={rv.reduce((a, r) => a + r.amount, 0)} tone="success" />
        <StatCard label="Total Paid (PV)" value={pv.reduce((a, r) => a + r.amount, 0)} tone="danger" />
        <StatCard label="RV Count" value={rv.length} format="raw" />
        <StatCard label="PV Count" value={pv.length} format="raw" />
      </div>

      <Tabs defaultValue="rv">
        <TabsList>
          <TabsTrigger value="rv">Receipt Vouchers</TabsTrigger>
          <TabsTrigger value="pv">Payment Vouchers</TabsTrigger>
        </TabsList>

        {(["rv", "pv"] as const).map((tab) => {
          const type = tab === "rv" ? "RV" : "PV";
          const rows = tab === "rv" ? rv : pv;
          const nextNum = `${type}-${String(rows.length + 1).padStart(4, "0")}`;
          return (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => exportCsv(`${type.toLowerCase()}-vouchers.csv`, rows)}>
                  <Download className="h-4 w-4" /> Export
                </Button>
                <FormDialog
                  title={`New ${type === "RV" ? "Receipt" : "Payment"} Voucher`}
                  trigger={<Button size="sm"><Plus className="h-4 w-4" /> New {type}</Button>}
                  onSubmit={(fd) => {
                    addVoucher({
                      type: type as "RV" | "PV",
                      number: String(fd.get("number") || nextNum),
                      date: String(fd.get("date") || today()),
                      company: fd.get("company") as never,
                      party: String(fd.get("party") || ""),
                      candidate: String(fd.get("candidate") || "") || undefined,
                      amount: Number(fd.get("amount") || 0),
                      paymentMethod: String(fd.get("paymentMethod") || ""),
                      purpose: String(fd.get("purpose") || ""),
                    });
                    toast.success("Voucher recorded");
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Voucher number" name="number" defaultValue={nextNum} required />
                    <Field label="Date" name="date" type="date" required defaultValue={today()} />
                  </div>
                  <SelectField label="Company" name="company" options={COMPANIES} required />
                  <Field label={type === "RV" ? "Received from" : "Paid to"} name="party" required />
                  <Field label="Candidate (optional)" name="candidate" />
                  <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
                  <SelectField label="Payment method" name="paymentMethod" options={PAYMENT_METHODS} required />
                  <Field label="Purpose" name="purpose" required />
                </FormDialog>
              </div>
              <DataTable
                rows={rows}
                columns={[
                  { key: "no", header: "No.", render: (r) => <span className="font-mono text-xs">{r.number}</span> },
                  { key: "date", header: "Date", render: (r) => r.date },
                  { key: "co", header: "Company", render: (r) => <Badge variant="outline">{r.company}</Badge> },
                  { key: "party", header: type === "RV" ? "From" : "To", render: (r) => r.party },
                  { key: "cand", header: "Candidate", render: (r) => r.candidate || "—" },
                  { key: "purpose", header: "Purpose", render: (r) => r.purpose },
                  { key: "pm", header: "Method", render: (r) => r.paymentMethod },
                  { key: "amt", header: "Amount", className: "text-right", render: (r) => <span className={"tabular font-medium " + (type === "RV" ? "text-[color:var(--success)]" : "text-[color:var(--destructive)]")}>{qar(r.amount)}</span> },
                  { key: "act", header: "", render: (r) => <Button size="icon" variant="ghost" onClick={() => deleteVoucher(r.id)}><Trash2 className="h-4 w-4" /></Button> },
                ]}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </AppLayout>
  );
}
