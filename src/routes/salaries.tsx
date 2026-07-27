import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSalary, deleteSalary, releaseSalary, useFinance, salaryHoldingTotal } from "@/lib/finance-store";
import type { SalaryHolding } from "@/lib/finance-types";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download, HandCoins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/salaries")({
  head: () => ({
    meta: [
      { title: "Housemaid Salary Control · Finance Control" },
      { name: "description", content: "Housemaid returned-salary holding and release control." },
    ],
  }),
  component: SalariesPage,
});

function SalariesPage() {
  const s = useFinance();
  const total = salaryHoldingTotal(s);

  return (
    <AppLayout>
      <PageHeader
        title="Returned Housemaid Salary Control"
        description="Salaries held until sponsorship transfer is complete."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv("salary-holdings.csv", s.salaries)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <FormDialog
              title="New salary holding"
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> New holding</Button>}
              onSubmit={(fd) => {
                addSalary({
                  date: String(fd.get("date") || today()),
                  housemaidName: String(fd.get("housemaidName") || ""),
                  passport: String(fd.get("passport") || ""),
                  previousSponsor: String(fd.get("previousSponsor") || ""),
                  newSponsor: String(fd.get("newSponsor") || "") || undefined,
                  amount: Number(fd.get("amount") || 0),
                  receivedFrom: String(fd.get("receivedFrom") || ""),
                  currentLocation: fd.get("currentLocation") as never,
                  status: "Holding",
                });
                toast.success("Salary holding recorded");
              }}
            >
              <Field label="Date received" name="date" type="date" required defaultValue={today()} />
              <Field label="Housemaid name" name="housemaidName" required />
              <Field label="Passport" name="passport" />
              <Field label="Previous sponsor" name="previousSponsor" required />
              <Field label="New sponsor (if known)" name="newSponsor" />
              <Field label="Salary amount (QAR)" name="amount" type="number" step="0.01" required />
              <Field label="Received from" name="receivedFrom" required />
              <SelectField label="Current location" name="currentLocation" options={["Cash", "CBQ"]} required />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Held" value={total} tone="warning" />
        <StatCard label="Active" value={s.salaries.filter((x) => x.status !== "Fully released").length} format="raw" />
        <StatCard label="In Cash" value={s.salaries.filter((x) => x.currentLocation === "Cash").reduce((a, x) => a + Math.max(0, x.amount - x.releases.reduce((r, rr) => r + rr.amount, 0)), 0)} />
        <StatCard label="In CBQ" value={s.salaries.filter((x) => x.currentLocation === "CBQ").reduce((a, x) => a + Math.max(0, x.amount - x.releases.reduce((r, rr) => r + rr.amount, 0)), 0)} />
      </div>

      <DataTable
        rows={s.salaries}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          { key: "name", header: "Housemaid", render: (r) => (
            <div>
              <div className="font-medium">{r.housemaidName}</div>
              <div className="text-xs text-muted-foreground">{r.passport}</div>
            </div>
          ) },
          { key: "prev", header: "Prev sponsor", render: (r) => r.previousSponsor },
          { key: "new", header: "New sponsor", render: (r) => r.newSponsor || "—" },
          { key: "amt", header: "Salary", className: "text-right", render: (r) => <span className="tabular">{qar(r.amount)}</span> },
          { key: "rel", header: "Released", className: "text-right", render: (r) => <span className="tabular">{qar(r.releases.reduce((a, x) => a + x.amount, 0))}</span> },
          { key: "loc", header: "Location", render: (r) => <Badge variant="outline">{r.currentLocation}</Badge> },
          {
            key: "st", header: "Status",
            render: (r) => (
              <Badge variant={r.status === "Fully released" ? "default" : r.status === "Partially released" ? "secondary" : "outline"}>
                {r.status}
              </Badge>
            ),
          },
          { key: "act", header: "", render: (r) => (
            <div className="flex gap-1">
              <ReleaseDialog salary={r} />
              <Button size="icon" variant="ghost" onClick={() => deleteSalary(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ) },
        ]}
      />
    </AppLayout>
  );
}

function ReleaseDialog({ salary }: { salary: SalaryHolding }) {
  const [open, setOpen] = useState(false);
  const released = salary.releases.reduce((a, r) => a + r.amount, 0);
  const remaining = salary.amount - released;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Release payment"><HandCoins className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release salary — {salary.housemaidName}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-2">Remaining to release: <span className="font-semibold text-foreground tabular">{qar(remaining)}</span></div>

        {salary.releases.length > 0 && (
          <div className="border rounded p-2 text-xs space-y-1 mb-2 bg-muted/30">
            <div className="font-semibold">History</div>
            {salary.releases.map((rel) => (
              <div key={rel.id} className="flex justify-between">
                <span>{rel.date} · {rel.receivedBy}</span>
                <span className="tabular">{qar(rel.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            releaseSalary(salary.id, {
              date: String(fd.get("date") || today()),
              amount: Number(fd.get("amount") || 0),
              receivedBy: String(fd.get("receivedBy") || ""),
              newSponsorDetails: String(fd.get("newSponsorDetails") || "") || undefined,
            });
            toast.success("Release recorded");
            setOpen(false);
          }}
        >
          <div className="space-y-1.5"><Label>Release date</Label><Input name="date" type="date" defaultValue={today()} required /></div>
          <div className="space-y-1.5"><Label>Amount (QAR)</Label><Input name="amount" type="number" step="0.01" max={remaining} required /></div>
          <div className="space-y-1.5"><Label>Received by</Label><Input name="receivedBy" required /></div>
          <div className="space-y-1.5"><Label>New sponsor details / transfer confirmation</Label><Input name="newSponsorDetails" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Release</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
