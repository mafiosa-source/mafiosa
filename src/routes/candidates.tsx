import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { FormDialog, Field, SelectField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addCandidate,
  deleteCandidate,
  updateCandidate,
  useFinance,
  candidateHoldingTotal,
} from "@/lib/finance-store";
import { COMPANIES, MONEY_LOCATIONS } from "@/lib/finance-types";
import { qar, today, exportCsv } from "@/lib/format";
import { Plus, Trash2, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "Candidate Holdings · Finance Control" },
      { name: "description", content: "Track money held for candidates and sponsors." },
    ],
  }),
  component: CandidatesPage,
});

const PURPOSES = ["QVC", "Visa", "Medical", "POLO Contract", "Transportation", "Penalty", "Service Charge", "Other"];
const PAYMENT_METHODS = ["Cash", "CBQ", "Company account", "Card"];
const STATUSES = ["Pending payment", "Paid", "Completed"];

function CandidatesPage() {
  const s = useFinance();
  const total = candidateHoldingTotal(s);
  const pending = s.candidates.filter((c) => c.status !== "Completed").length;

  return (
    <AppLayout>
      <PageHeader
        title="Candidate Financial Holding"
        description="Money received for candidates that has not yet been used or cleared."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv("candidate-holdings.csv", s.candidates)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <FormDialog
              title="New candidate holding"
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> New holding</Button>}
              onSubmit={(fd) => {
                addCandidate({
                  date: String(fd.get("date") || today()),
                  candidateName: String(fd.get("candidateName") || ""),
                  passport: String(fd.get("passport") || ""),
                  nationality: String(fd.get("nationality") || ""),
                  sponsor: String(fd.get("sponsor") || ""),
                  company: fd.get("company") as never,
                  purpose: fd.get("purpose") as never,
                  amount: Number(fd.get("amount") || 0),
                  paymentMethod: fd.get("paymentMethod") as never,
                  currentLocation: fd.get("currentLocation") as never,
                  status: (fd.get("status") as never) || "Pending payment",
                  notes: String(fd.get("notes") || "") || undefined,
                });
                toast.success("Holding recorded");
              }}
            >
              <Field label="Date received" name="date" type="date" required defaultValue={today()} />
              <Field label="Candidate name" name="candidateName" required />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Passport number" name="passport" />
                <Field label="Nationality" name="nationality" />
              </div>
              <Field label="Sponsor name" name="sponsor" required />
              <SelectField label="Recruitment company" name="company" options={COMPANIES} required />
              <SelectField label="Money purpose" name="purpose" options={PURPOSES} required />
              <Field label="Amount (QAR)" name="amount" type="number" step="0.01" required />
              <SelectField label="Payment method" name="paymentMethod" options={PAYMENT_METHODS} required />
              <SelectField label="Current money location" name="currentLocation" options={MONEY_LOCATIONS} required />
              <SelectField label="Status" name="status" options={STATUSES} required defaultValue="Pending payment" />
            </FormDialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Held" value={total} tone="warning" />
        <StatCard label="Active Holdings" value={pending} format="raw" />
        <StatCard label="In Cash" value={s.candidates.filter((c) => c.status !== "Completed" && c.currentLocation === "Cash in hand").reduce((a, c) => a + c.amount, 0)} />
        <StatCard label="In CBQ" value={s.candidates.filter((c) => c.status !== "Completed" && c.currentLocation === "CBQ").reduce((a, c) => a + c.amount, 0)} />
      </div>

      <DataTable
        rows={s.candidates}
        columns={[
          { key: "date", header: "Date", render: (r) => r.date },
          { key: "name", header: "Candidate", render: (r) => (
            <div>
              <div className="font-medium">{r.candidateName}</div>
              <div className="text-xs text-muted-foreground">{r.passport} · {r.nationality}</div>
            </div>
          ) },
          { key: "sponsor", header: "Sponsor", render: (r) => r.sponsor },
          { key: "co", header: "Company", render: (r) => <Badge variant="outline">{r.company}</Badge> },
          { key: "purpose", header: "Purpose", render: (r) => r.purpose },
          { key: "amt", header: "Amount", className: "text-right", render: (r) => <span className="tabular font-medium">{qar(r.amount)}</span> },
          {
            key: "loc", header: "Money Location",
            render: (r) => (
              <Select value={r.currentLocation} onValueChange={(v) => updateCandidate(r.id, { currentLocation: v as never })}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONEY_LOCATIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            ),
          },
          {
            key: "status", header: "Status",
            render: (r) => (
              <Select value={r.status} onValueChange={(v) => updateCandidate(r.id, { status: v as never })}>
                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            ),
          },
          { key: "act", header: "", render: (r) => <Button size="icon" variant="ghost" onClick={() => deleteCandidate(r.id)}><Trash2 className="h-4 w-4" /></Button> },
        ]}
      />
    </AppLayout>
  );
}
