import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Name accuracy check used before saving a housemaid or sponsor.
 * The name is shown large so spelling can be compared with the passport / QID.
 */
export function NameConfirmDialog({
  open,
  name,
  entity,
  documentLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  name: string;
  entity: string;
  documentLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm {entity} name</AlertDialogTitle>
          <AlertDialogDescription>
            Please check the spelling exactly as written on the {documentLabel}. This name is used on
            contracts, vouchers and reports.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-center text-xl font-semibold tracking-wide">
          {name}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back and edit</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Name is correct — save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
