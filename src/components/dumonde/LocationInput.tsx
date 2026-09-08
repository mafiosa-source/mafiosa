import { Input } from "@/components/ui/input";

/** Free-text location with suggestions from locations already used. */
export function LocationInput({
  value,
  onChange,
  options,
  id = "dm-location",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  id?: string;
}) {
  return (
    <>
      <Input
        list={`${id}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Du Monde Industrial Area"
        className="h-9"
      />
      <datalist id={`${id}-list`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
