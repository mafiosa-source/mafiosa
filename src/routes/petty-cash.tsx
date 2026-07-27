import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addPettyCash, deletePettyCash, useFinance, pettyCashBalance, setOpeningBalance } from "@/lib/finance-store";
import { COMPANIES } from "@/lib/finance-types";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/petty-cash")({
  head: () => ({
    meta: [
      { title: "Office Petty Cash · Finance Control" },
      { name: "description", content: "Track office petty cash movements." },
    ],
  }),
  component: PettyCashPage,
});

const CATEGORIES = ["Office supplies", "Travel", "Fees", "Refund", "Deposit", "Utilities", "Other"];

function PettyCashPage() {
  const s = useFinance();
  const { opening, received, paid, balance } = pettyCashBalance(s, "office");
  const rows = s.pettyCash.filter((x) => x.scope === "office");

  return (
    <AppLayout>
      <PageHeader
        title="Office Petty Cash"
        description="All incoming and outgoing office cash movements."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv("office-petty-cash.csv", rows)}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <FormDialog
              title="New petty cash entry"
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4" /> New entry
                </Button>
              }
              onSubmit={(fd) => {
                addPettyCash({
                  scope: "office",
                  date: String(fd.get("date") || today()),
                  description: String(fd.get("description") || ""),
                  category: String(fd.get("category") || "Other"),
                  amount: Number(fd.get("amount") || 0),
                  type: (fd.get("type") as "received" | "paid") || "paid",
                  company: (fd.get("company") as never) || undefined,
                  candidate: String(fd.get("candidate") || "") || undefined,
                });
                toast.success("Entry added");
              }}
            >
              <Field label="Date" name="date" type="date" required defaultValue={today()} />
              <SelectField label="Type" name="type" options={["received", "paid"]} required />
              <Field label="Description" name="description" required />
              <SelectField label="Category" name="category" options={CATEGORIES} required />
              <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
              <SelectField label="Related company" name="company" options={COMPANIES} />
              <Field label="Related candidate (optional)" name="candidate" />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Opening Balance" value={opening} />
        <StatCard label="Received" value={received} tone="success" />
        <StatCard label="Paid" value={paid} tone="danger" />
        <StatCard label="Current Balance" value={balance} tone="info" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Set opening balance:</span>
        <input
          type="number"
          step="0.01"
          defaultValue={opening}
          className="h-8 w-32 rounded border border-input px-2 text-sm"
          onBlur={(e) => setOpeningBalance("office", Number(e.target.value || 0))}
        />
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          {
            key: "type",
            header: "Type",
            render: (r) => (
              <Badge variant={r.type === "received" ? "default" : "secondary"}>
                {r.type}
              </Badge>
            ),
          },
          { key: "desc", header: "Description", render: (r) => r.description },
          { key: "cat", header: "Category", render: (r) => r.category },
          { key: "co", header: "Company", render: (r) => r.company || "—" },
          { key: "cand", header: "Candidate", render: (r) => r.candidate || "—" },
          {
            key: "amt",
            header: "Amount",
            render: (r) => (
              <span className={r.type === "received" ? "text-[color:var(--success)] font-medium tabular" : "text-[color:var(--destructive)] font-medium tabular"}>
                {r.type === "received" ? "+" : "−"} {qar(r.amount)}
              </span>
            ),
            className: "text-right",
          },
          {
            key: "act",
            header: "",
            render: (r) => (
              <Button size="icon" variant="ghost" onClick={() => deletePettyCash(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          },
        ]}
      />
    </AppLayout>
  );
}
