import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchable = true,
  empty = "No records yet.",
}: {
  rows: T[];
  columns: { key: string; header: string; render: (r: T) => ReactNode; className?: string }[];
  searchable?: boolean;
  empty?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <div className="rounded-lg border bg-card">
      {searchable ? (
        <div className="p-3 border-b flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="h-8 max-w-xs border-0 shadow-none focus-visible:ring-0"
          />
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length}
          </span>
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render(r)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
