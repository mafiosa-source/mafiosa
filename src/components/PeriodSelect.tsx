import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_PRESETS, resolvePeriod } from "@/lib/period";
import type { Period, PeriodPreset } from "@/lib/period";

/**
 * Reporting period selector. Defaults to the current month everywhere.
 * Historical months are always available through Previous Month / Custom / All Time.
 */
export function PeriodSelect({
  period,
  onChange,
  className,
}: {
  period: Period;
  onChange: (p: Period) => void;
  className?: string;
}) {
  const setPreset = (v: string) =>
    onChange(resolvePeriod(v as PeriodPreset, period.from, period.to));

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className ?? ""}`}>
      <div className="space-y-1.5">
        <Label className="text-xs">Reporting period</Label>
        <Select value={period.preset} onValueChange={setPreset}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          value={period.from}
          onChange={(e) => onChange(resolvePeriod("custom", e.target.value, period.to))}
          className="h-9 w-[160px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          value={period.to}
          onChange={(e) => onChange(resolvePeriod("custom", period.from, e.target.value))}
          className="h-9 w-[160px]"
        />
      </div>
      <p className="text-xs text-muted-foreground pb-2">{period.label}</p>
    </div>
  );
}
