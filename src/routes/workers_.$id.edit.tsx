import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
  const { isAdmin, loading } = useAppUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/workers" });
  }, [loading, isAdmin, navigate]);

  if (loading) return <AppLayout><div className="py-20" /></AppLayout>;

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="Edit CV" description="Only the administrator can edit a CV." />
        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/workers" })}>
          Back to CVs
        </Button>
      </AppLayout>
    );
  }

  return <CandidateForm editId={id} />;
}
