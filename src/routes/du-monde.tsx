import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addPettyCash, deletePettyCash, useFinance, pettyCashBalance, setOpeningBalance } from "@/lib/finance-store";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/du-monde")({
  head: () => ({
    meta: [
      { title: "Du Monde Petty Cash · Finance Control" },
      { name: "description", content: "Du Monde factory catering petty cash." },
    ],
  }),
  component: DuMondePage,
});

const CATEGORIES = ["Coffee beans", "Milk", "Cups", "Syrups", "Transport", "Equipment", "Salaries", "Other"];

function DuMondePage() {
  const s = useFinance();
  const { opening, received, paid, balance } = pettyCashBalance(s, "dumonde");
  const rows = s.pettyCash.filter((x) => x.scope === "dumonde");

  return (
    <AppLayout>
      <PageHeader
        title="Du Monde Petty Cash"
        description="Factory catering petty cash — separate from office."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv("dumonde-petty-cash.csv", rows)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <FormDialog
              title="New Du Monde entry"
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> New entry</Button>}
              onSubmit={(fd) => {
                addPettyCash({
                  scope: "dumonde",
                  date: String(fd.get("date") || today()),
                  description: String(fd.get("description") || ""),
                  category: String(fd.get("category") || "Other"),
                  amount: Number(fd.get("amount") || 0),
                  type: (fd.get("type") as "received" | "paid") || "paid",
                });
                toast.success("Entry added");
              }}
            >
              <Field label="Date" name="date" type="date" required defaultValue={today()} />
              <SelectField label="Type" name="type" options={["received", "paid"]} required />
              <Field label="Description" name="description" required />
              <SelectField label="Category" name="category" options={CATEGORIES} required />
              <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Opening Balance" value={opening} />
        <StatCard label="Money Added" value={received} tone="success" />
        <StatCard label="Factory Expenses" value={paid} tone="danger" />
        <StatCard label="Current Balance" value={balance} tone="info" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Set opening balance:</span>
        <input
          type="number"
          step="0.01"
          defaultValue={opening}
          className="h-8 w-32 rounded border border-input px-2 text-sm"
          onBlur={(e) => setOpeningBalance("dumonde", Number(e.target.value || 0))}
        />
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          {
            key: "type", header: "Type",
            render: (r) => <Badge variant={r.type === "received" ? "default" : "secondary"}>{r.type}</Badge>,
          },
          { key: "desc", header: "Description", render: (r) => r.description },
          { key: "cat", header: "Category", render: (r) => r.category },
          {
            key: "amt", header: "Amount", className: "text-right",
            render: (r) => (
              <span className={r.type === "received" ? "text-[color:var(--success)] tabular" : "text-[color:var(--destructive)] tabular"}>
                {r.type === "received" ? "+" : "−"} {qar(r.amount)}
              </span>
            ),
          },
          {
            key: "act", header: "",
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
