import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { addCardTxn, deleteCardTxn, useFinance, cardUsage, limitCardBreakdown } from "@/lib/finance-store";
import { CARD_META, COMPANIES } from "@/lib/finance-types";
import type { CardKey } from "@/lib/finance-types";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Company Cards · Finance Control" },
      { name: "description", content: "Company card management and monthly closing." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const s = useFinance();

  return (
    <AppLayout>
      <PageHeader
        title="Company Card Management"
        description="Track usage, limits, and monthly closing for all company cards."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(Object.keys(CARD_META) as CardKey[]).map((k) => {
          const meta = CARD_META[k];
          const { total } = cardUsage(s, k);
          const pct = Math.min(100, (total / meta.limit) * 100);
          return (
            <Card key={k}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex justify-between">
                  <span>{meta.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">****{meta.last4}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-semibold tabular">{qar(total)}</div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Limit {qar(meta.limit)}</span>
                  <span>Close: {qar(total)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="maryam">
        <TabsList>
          <TabsTrigger value="maryam">Maryam</TabsTrigger>
          <TabsTrigger value="yousef">Yousef</TabsTrigger>
          <TabsTrigger value="maha">Maha Petrol</TabsTrigger>
          <TabsTrigger value="limit">Limit Card</TabsTrigger>
        </TabsList>

        <TabsContent value="maryam"><MaryamTab /></TabsContent>
        <TabsContent value="yousef"><YousefTab /></TabsContent>
        <TabsContent value="maha"><MahaTab /></TabsContent>
        <TabsContent value="limit"><LimitTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function DeleteBtn({ id }: { id: string }) {
  return (
    <Button size="icon" variant="ghost" onClick={() => deleteCardTxn(id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function ExportBtn({ card }: { card: CardKey }) {
  const s = useFinance();
  const rows = s.cardTxns.filter((t) => t.card === card);
  return (
    <Button variant="outline" size="sm" onClick={() => exportCsv(`${card}-card.csv`, rows)}>
      <Download className="h-4 w-4" /> Export
    </Button>
  );
}

const MARYAM_CATS = ["Office", "Fees", "Immigration", "Travel", "Supplies", "Other"];

function MaryamTab() {
  const s = useFinance();
  const rows = s.cardTxns.filter((t) => t.card === "maryam");
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end gap-2">
        <ExportBtn card="maryam" />
        <FormDialog
          title="Maryam Card expense"
          trigger={<Button size="sm"><Plus className="h-4 w-4" /> New expense</Button>}
          onSubmit={(fd) => {
            addCardTxn({
              card: "maryam",
              date: String(fd.get("date") || today()),
              description: String(fd.get("description") || ""),
              category: String(fd.get("category") || "Other"),
              amount: Number(fd.get("amount") || 0),
              company: (fd.get("company") as never) || undefined,
              candidate: String(fd.get("candidate") || "") || undefined,
            });
            toast.success("Expense recorded");
          }}
        >
          <Field label="Date" name="date" type="date" required defaultValue={today()} />
          <Field label="Expense description" name="description" required />
          <SelectField label="Category" name="category" options={MARYAM_CATS} required />
          <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
          <SelectField label="Company" name="company" options={COMPANIES} />
          <Field label="Candidate (optional)" name="candidate" />
        </FormDialog>
      </div>
      <DataTable
        rows={rows}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          { key: "desc", header: "Description", render: (r) => r.description },
          { key: "cat", header: "Category", render: (r) => r.category },
          { key: "co", header: "Company", render: (r) => r.company || "—" },
          { key: "cand", header: "Candidate", render: (r) => r.candidate || "—" },
          { key: "amt", header: "Amount", className: "text-right", render: (r) => <span className="tabular">{qar(r.amount)}</span> },
          { key: "act", header: "", render: (r) => <DeleteBtn id={r.id} /> },
        ]}
      />
    </div>
  );
}

const YOUSEF_TYPES = ["Visa", "Visa cancellation", "QVC", "Medical", "Government payments", "Other"];

function YousefTab() {
  const s = useFinance();
  const rows = s.cardTxns.filter((t) => t.card === "yousef");
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end gap-2">
        <ExportBtn card="yousef" />
        <FormDialog
          title="Yousef Card — Immigration expense"
          trigger={<Button size="sm"><Plus className="h-4 w-4" /> New expense</Button>}
          onSubmit={(fd) => {
            addCardTxn({
              card: "yousef",
              date: String(fd.get("date") || today()),
              description: String(fd.get("expenseType") || ""),
              category: String(fd.get("expenseType") || "Other"),
              expenseType: fd.get("expenseType") as never,
              candidate: String(fd.get("candidate") || ""),
              amount: Number(fd.get("amount") || 0),
            });
            toast.success("Expense recorded");
          }}
        >
          <Field label="Date" name="date" type="date" required defaultValue={today()} />
          <Field label="Candidate name" name="candidate" required />
          <SelectField label="Expense type" name="expenseType" options={YOUSEF_TYPES} required />
          <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
        </FormDialog>
      </div>
      <DataTable
        rows={rows}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          { key: "cand", header: "Candidate", render: (r) => r.candidate || "—" },
          { key: "type", header: "Expense type", render: (r) => r.expenseType || "—" },
          { key: "amt", header: "Amount", className: "text-right", render: (r) => <span className="tabular">{qar(r.amount)}</span> },
          { key: "act", header: "", render: (r) => <DeleteBtn id={r.id} /> },
        ]}
      />
    </div>
  );
}

function MahaTab() {
  const s = useFinance();
  const rows = s.cardTxns.filter((t) => t.card === "maha");

  // fuel anomaly detection: consumption per KM
  const anomalies = rows.filter((r) => {
    if (!r.kmBefore || !r.kmAfter || !r.amount) return false;
    const dist = r.kmAfter - r.kmBefore;
    if (dist <= 0) return true;
    const perKm = r.amount / dist;
    return perKm > 1.5; // > 1.5 QAR/km flagged
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end gap-2">
        <ExportBtn card="maha" />
        <FormDialog
          title="Petrol Card — fuel entry"
          trigger={<Button size="sm"><Plus className="h-4 w-4" /> New fuel entry</Button>}
          onSubmit={(fd) => {
            addCardTxn({
              card: "maha",
              date: String(fd.get("date") || today()),
              description: `Fuel — ${fd.get("plateNumber")}`,
              category: "Fuel",
              amount: Number(fd.get("amount") || 0),
              driver: String(fd.get("driver") || ""),
              vehicle: String(fd.get("vehicle") || ""),
              vehicleOwner: fd.get("vehicleOwner") as never,
              plateNumber: String(fd.get("plateNumber") || ""),
              station: String(fd.get("station") || ""),
              kmBefore: Number(fd.get("kmBefore") || 0),
              kmAfter: Number(fd.get("kmAfter") || 0),
              odo: Number(fd.get("odo") || 0),
            });
            toast.success("Fuel entry recorded");
          }}
        >
          <Field label="Date" name="date" type="date" required defaultValue={today()} />
          <Field label="Driver name" name="driver" required />
          <Field label="Vehicle" name="vehicle" required />
          <SelectField label="Vehicle owner company" name="vehicleOwner" options={COMPANIES} required />
          <Field label="Plate number" name="plateNumber" required />
          <Field label="Petrol station" name="station" required />
          <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
          <div className="grid grid-cols-3 gap-2">
            <Field label="KM before" name="kmBefore" type="number" />
            <Field label="KM after" name="kmAfter" type="number" />
            <Field label="ODO" name="odo" type="number" />
          </div>
        </FormDialog>
      </div>

      {anomalies.length > 0 ? (
        <div className="rounded-md border border-[color:var(--warning)] bg-[color:var(--warning)]/10 p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
          <span>{anomalies.length} fuel entries show abnormal consumption (&gt; 1.5 QAR/km).</span>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          { key: "driver", header: "Driver", render: (r) => r.driver },
          { key: "vehicle", header: "Vehicle", render: (r) => `${r.vehicle} (${r.plateNumber})` },
          { key: "owner", header: "Owner", render: (r) => r.vehicleOwner },
          { key: "km", header: "Distance", render: (r) => `${(r.kmAfter || 0) - (r.kmBefore || 0)} km` },
          { key: "odo", header: "ODO", render: (r) => r.odo },
          { key: "amt", header: "Amount", className: "text-right", render: (r) => <span className="tabular">{qar(r.amount)}</span> },
          { key: "act", header: "", render: (r) => <DeleteBtn id={r.id} /> },
        ]}
      />
    </div>
  );
}

const FACTORY_CATS = ["Coffee beans", "Milk", "Cups", "Syrups", "Transport", "Equipment", "Other"];

function LimitTab() {
  const s = useFinance();
  const rows = s.cardTxns.filter((t) => t.card === "limit");
  const { personal, company, factory, total } = limitCardBreakdown(s);
  const remaining = CARD_META.limit.limit - total;

  const [branch, setBranch] = useState<"personal" | "company" | "factory">("personal");

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Personal" value={personal} />
        <StatCard label="Company" value={company} />
        <StatCard label="Factory" value={factory} />
        <StatCard label="Total used" value={total} tone="warning" />
        <StatCard label="Remaining" value={remaining} tone="success" />
        <StatCard label="To close" value={total} tone="danger" />
      </div>

      <div className="flex justify-end gap-2">
        <ExportBtn card="limit" />
        <FormDialog
          title="Limit Card expense"
          trigger={<Button size="sm"><Plus className="h-4 w-4" /> New expense</Button>}
          onSubmit={(fd) => {
            const b = branch;
            addCardTxn({
              card: "limit",
              limitBranch: b,
              date: String(fd.get("date") || today()),
              description: String(fd.get("description") || ""),
              category: b === "factory" ? String(fd.get("factoryCategory") || "Other") : b === "company" ? String(fd.get("category") || "Other") : "Personal",
              amount: Number(fd.get("amount") || 0),
              person: b === "personal" ? String(fd.get("person") || "") : undefined,
              company: b === "company" ? (fd.get("company") as never) : undefined,
              factoryCategory: b === "factory" ? (fd.get("factoryCategory") as never) : undefined,
            });
            toast.success("Expense recorded");
          }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expense branch</label>
            <div className="flex gap-2">
              {(["personal", "company", "factory"] as const).map((b) => (
                <Button
                  key={b}
                  type="button"
                  variant={branch === b ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBranch(b)}
                >
                  {b === "personal" ? "Personal" : b === "company" ? "Company" : "Du Monde Factory"}
                </Button>
              ))}
            </div>
          </div>
          <Field label="Date" name="date" type="date" required defaultValue={today()} />
          <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
          <Field label="Description" name="description" required />
          {branch === "personal" && <Field label="Person" name="person" required />}
          {branch === "company" && (
            <>
              <SelectField label="Company" name="company" options={COMPANIES} required />
              <SelectField label="Expense category" name="category" options={MARYAM_CATS} required />
            </>
          )}
          {branch === "factory" && (
            <SelectField label="Factory category" name="factoryCategory" options={FACTORY_CATS} required />
          )}
        </FormDialog>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          {
            key: "branch", header: "Branch",
            render: (r) => (
              <Badge variant="outline">{r.limitBranch}</Badge>
            ),
          },
          { key: "desc", header: "Description", render: (r) => r.description },
          {
            key: "detail", header: "Detail",
            render: (r) => r.limitBranch === "personal" ? r.person : r.limitBranch === "company" ? `${r.company} · ${r.category}` : r.factoryCategory,
          },
          { key: "amt", header: "Amount", className: "text-right", render: (r) => <span className="tabular">{qar(r.amount)}</span> },
          { key: "act", header: "", render: (r) => <DeleteBtn id={r.id} /> },
        ]}
      />
    </div>
  );
}
