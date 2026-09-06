import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { ShieldCheck, Users, History, KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Alhakeem Group ERP" },
      { name: "description", content: "Administration dashboard." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const cards = [
    {
      to: "/admin/users",
      title: "Users & Permissions",
      description: "Approve new users, assign roles, reset passwords, and control module access.",
      icon: Users,
    },
    {
      to: "/admin/activity",
      title: "Activity Log",
      description: "Review all changes made by users across the system.",
      icon: History,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Admin"
        description="Manage users, approve access requests, reset passwords, and assign roles."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">{card.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Super Admin Account</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your admin account (m.aconsultingqatar@gmail.com) has full access to all modules and can manage all users.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" />
          Default password: Alhakeem@2026 — change it after first sign-in.
        </div>
      </div>
    </AppLayout>
  );
}
