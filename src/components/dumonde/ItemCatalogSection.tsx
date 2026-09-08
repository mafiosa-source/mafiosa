import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { qar } from "@/lib/format";
import { useAppUser } from "@/lib/app-user";
import {
  DM_ITEM_CATEGORIES,
  deleteDmItem,
  saveDmItem,
  useDuMonde,
  type DmItem,
} from "@/lib/dumonde-ops";

export function ItemCatalogSection() {
  const s = useDuMonde();
  const { isAdmin } = useAppUser();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DmItem | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("HOT DRINKS");
  const [price, setPrice] = useState("0");
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const q = search.trim().toUpperCase();
    const list = s.items.filter(
      (i) => !q || i.code.toUpperCase().includes(q) || i.name.toUpperCase().includes(q),
    );
    const map = new Map<string, DmItem[]>();
    list.forEach((i) => map.set(i.category, [...(map.get(i.category) ?? []), i]));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [s.items, search]);

  const startNew = () => {
    setEditing(null);
    setCode("");
    setName("");
    setCategory("HOT DRINKS");
    setPrice("0");
    setOpen(true);
  };

  const startEdit = (item: DmItem) => {
    setEditing(item);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setPrice(String(item.price));
    setOpen(true);
  };

  const submit = async () => {
    if (!code.trim() || !name.trim()) return toast.error("Enter a code and an item name.");
    setSaving(true);
    try {
      await saveDmItem(
        { code, name, category, price: Number(price) || 0, active: editing?.active ?? true },
        editing?.id,
      );
      toast.success("Saved.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: DmItem) => {
    if (!window.confirm(`Remove ${item.code} – ${item.name} from the item list?`)) return;
    try {
      await deleteDmItem(item.id);
      toast.success("Removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Standard item codes, names and prices. Prices here are the correct selling prices used to check sales.
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or item"
            className="h-9 w-48"
          />
          {isAdmin ? (
            <Button size="sm" onClick={startNew}>
              <Plus className="h-4 w-4" /> New item
            </Button>
          ) : null}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border bg-card py-10 text-center text-muted-foreground">No items found.</div>
      ) : (
        groups.map(([cat, items]) => (
          <div key={cat} className="rounded-lg border bg-card">
            <div className="border-b px-3 py-2 text-sm font-semibold">
              {cat} <span className="text-muted-foreground">({items.length})</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-32 text-right">Price</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="tabular font-medium">{i.code}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell className="text-right tabular">{i.price ? qar(i.price) : "—"}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(i)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => void remove(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "New item"}</DialogTitle>
            <DialogDescription>Codes must be unique, for example H112 or S106.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DM_ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Item name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price (QAR)</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
