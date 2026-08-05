import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * A housemaid / candidate name anywhere in the app.
 * Clicking it opens the full 360° financial profile for that person.
 */
export function HousemaidLink({
  name,
  className,
  onNavigate,
}: {
  name?: string | null;
  className?: string;
  onNavigate?: () => void;
}) {
  const label = (name ?? "").trim();
  if (!label) return <span className="text-muted-foreground">—</span>;
  return (
    <Link
      to="/housemaid/$name"
      params={{ name: label }}
      onClick={onNavigate}
      className={cn("font-medium text-primary underline-offset-2 hover:underline", className)}
      title={`Open financial profile for ${label}`}
    >
      {label}
    </Link>
  );
}
