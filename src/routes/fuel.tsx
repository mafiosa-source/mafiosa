import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, FileSpreadsheet } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { COMPANIES, COMPANY_LABEL, WALLET_BY_KEY, DRIVERS, vehicleLabel, vehiclesForCompany } from "@/lib/finance-types";
import type { Company } from "@/lib/finance-types";
import { fuelTransactions, toFuelPrintRows, toFuelCsvRows, fuelKmMap, fuelOdometer } from "@/lib/report-filters";
import { qar, num, today, dayOfWeek, printFuelReport, exportExcel } from "@/lib/format";

export const Route = createFileRoute("/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel & Vehicle Report · Alhakeem Expenses ERP" },
      {
        name: "description",
        content: "Fuel expenses by vehicle, number plate, driver and company with odometer and kilometre totals.",
      },
      { property: "og:title", content: "Fuel & Vehicle Report · Alhakeem Expenses ERP" },
      { property: "og:description", content: "Track fuel spending and kilometres per vehicle and driver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FuelPage,
});

const monthStart = () => `${today().slice(0, 7)}-01`;

function FuelPage() {
  const s = useFinance();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [company, setCompany] = useState("__all__");
  const [vehicle, setVehicle] = useState("__all__");
  const [driver, setDriver] = useState("__all__");

  const all = useMemo(() => fuelTransactions(s.transactions, {}), [s.transactions]);
  const registryVehicles = useMemo(
    () => vehiclesForCompany(company === "__all__" || company === "__none__" ? undefined : (company as Company)),
    [company],
  );
  const vehicles = useMemo(() => {
    const registry = registryVehicles.map(vehicleLabel);
    const seen = new Set(registry);
    const derived = all
      .filter((t) =>
        company === "__all__" ? true : company === "__none__" ? !t.company : t.company === company,
      )
      .map((t) => [t.vehicle, t.plateNumber].filter(Boolean).join(" ").trim())
      .filter((v) => v && !seen.has(v));
    return [...registry, ...Array.from(new Set(derived)).sort()];
  }, [all, company, registryVehicles]);
  const drivers = useMemo(() => {
    const base = [...DRIVERS] as string[];
    const derived = Array.from(
      new Set(all.map((t) => t.driver).filter((d): d is string => !!d && !base.includes(d))),
    ).sort();
    return [...base, ...derived];
  }, [all]);

  const rows = useMemo(
    () =>
      fuelTransactions(s.transactions, {
        from,
        to,
        company,
        vehicle:
          vehicle === "__all__"
            ? undefined
            : (registryVehicles.find((v) => vehicleLabel(v) === vehicle)?.name ?? vehicle),
        plateNumber:
          vehicle === "__all__" ? undefined : registryVehicles.find((v) => vehicleLabel(v) === vehicle)?.plate,
        driver: driver === "__all__" ? undefined : driver,
      }),
    [s.transactions, from, to, company, vehicle, driver, registryVehicles],
  );

  const kmMap = useMemo(() => fuelKmMap(rows), [rows]);
  const totalAmount = rows.reduce((a, t) => a + t.amount, 0);
  const totalKm = rows.reduce((a, t) => a + (kmMap.get(t.id) ?? 0), 0);
  const perLitreKm = totalKm > 0 ? totalAmount / totalKm : 0;


  function print() {
    printFuelReport({
      title: "Fuel & Vehicle Report",
      subtitle: [
        vehicle !== "__all__" ? `Vehicle: ${vehicle}` : null,
        driver !== "__all__" ? `Driver: ${driver}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      from,
      to,
      company: company === "__all__" ? undefined : company === "__none__" ? "No company" : COMPANY_LABEL[company as never],
      rows: toFuelPrintRows(rows),
    });
  }

  return (
    <AppLayout>
      <PageHeader
        title="Fuel & Vehicle Report"
        description="Every fuel transaction with day, vehicle, number plate, odometer, kilometres and driver."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportExcel("fuel-report.xls", toFuelCsvRows(rows), "Fuel & Vehicle Report")}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button size="sm" onClick={print}>
              <Printer className="h-4 w-4" /> Print Report
            </Button>
          </div>
        }
      />

      <div className="mb-5 rounded-lg border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Company</Label>
          <Select
            value={company}
            onValueChange={(v) => {
              setCompany(v);
              setVehicle("__all__");
            }}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All companies</SelectItem>
              <SelectItem value="__none__">-- None --</SelectItem>
              {COMPANIES.map((c) => (
                <SelectItem key={c} value={c}>{COMPANY_LABEL[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vehicle</Label>
          <Select value={vehicle} onValueChange={setVehicle}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Driver</Label>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Fuel transactions" value={rows.length} format="raw" />
        <StatCard label="Total fuel expense" value={totalAmount} tone="warning" />
        <StatCard label="Total kilometres" value={totalKm} format="raw" tone="info" />
        <StatCard label="Cost per km" value={perLitreKm} />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Plate</th>
              <th className="px-3 py-2 text-right">Odometer</th>
              <th className="px-3 py-2 text-right">KM</th>
              <th className="px-3 py-2">Driver</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Paid from</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  No fuel transactions for this selection.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{t.date}</td>
                  <td className="px-3 py-2">{dayOfWeek(t.date)}</td>
                  <td className="px-3 py-2">{t.company ? COMPANY_LABEL[t.company] : "—"}</td>
                  <td className="px-3 py-2">{t.vehicle || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.plateNumber || "—"}</td>
                  <td className="px-3 py-2 text-right tabular">{t.kmAfter != null ? num(t.kmAfter) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular">{fuelKm(t) != null ? num(fuelKm(t) as number) : "—"}</td>
                  <td className="px-3 py-2">{t.driver || "—"}</td>
                  <td className="px-3 py-2 text-right tabular font-medium">{qar(t.amount)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-muted/40 font-semibold">
              <tr className="border-t">
                <td className="px-3 py-2" colSpan={6}>Grand Total</td>
                <td className="px-3 py-2 text-right tabular">{num(totalKm)}</td>
                <td />
                <td className="px-3 py-2 text-right tabular">{qar(totalAmount)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </AppLayout>
  );
}
