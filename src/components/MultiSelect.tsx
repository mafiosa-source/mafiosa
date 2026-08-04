import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string; group?: string };

/**
 * Compact multi-select used by report filters.
 * An empty selection means "everything".
 */
export function MultiSelect({
  options,
  value,
  onChange,
  allLabel = "All",
  placeholder = "Select…",
  className,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const label =
    value.length === 0
      ? allLabel
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? placeholder
        : `${value.length} selected`;

  const groups = Array.from(new Set(options.map((o) => o.group ?? "")));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 justify-between font-normal", className)}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
          <span className="text-muted-foreground">{value.length || "All"} selected</span>
          <button type="button" className="font-medium hover:underline" onClick={() => onChange([])}>
            Clear
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {groups.map((g) => (
            <div key={g}>
              {g ? (
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g}
                </div>
              ) : null}
              {options
                .filter((o) => (o.group ?? "") === g)
                .map((o) => {
                  const active = value.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggle(o.value)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded border",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {active ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="truncate">{o.label}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
