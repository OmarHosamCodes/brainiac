import { createFileRoute } from "@tanstack/react-router";

import { DashboardSurface } from "@/components/dashboard/dashboard-surface";
import { AppLayout } from "@/layouts/app-layout";
import { requireAuthenticatedRoute } from "@/lib/auth-guard";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuthenticatedRoute,
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <AppLayout>
      <DashboardSurface />
    </AppLayout>
  );
}
