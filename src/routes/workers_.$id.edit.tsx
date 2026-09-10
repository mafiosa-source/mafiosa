import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAppUser } from "@/lib/app-user";
import { CandidateForm } from "./workers_.new";

export const Route = createFileRoute("/workers_/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit CV · Alhakeem Group ERP" },
      { name: "description", content: "Administrator editing of a domestic worker CV." },
    ],
  }),
  component: EditCandidatePage,
});

function EditCandidatePage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAppUser();

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="Edit CV" description="Only the administrator can edit a CV." />
        <Button size="sm" variant="outline" asChild>
          <a href="/workers">Back to CVs</a>
        </Button>
      </AppLayout>
    );
  }

  return <CandidateForm editId={id} />;
}
