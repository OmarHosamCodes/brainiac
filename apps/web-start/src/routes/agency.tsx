import { createFileRoute } from "@tanstack/react-router";

import { AgencySurface } from "@/components/agency/agency-surface";
import { parseAgencySearch } from "@/hooks/use-agency-search";
import { AppLayout } from "@/layouts/app-layout";
import { requireAuthenticatedRoute } from "@/lib/auth-guard";

export const Route = createFileRoute("/agency")({
  beforeLoad: requireAuthenticatedRoute,
  validateSearch: parseAgencySearch,
  component: AgencyRoute,
});

function AgencyRoute() {
  return (
    <AppLayout>
      <AgencySurface />
    </AppLayout>
  );
}
