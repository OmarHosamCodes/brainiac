import { createFileRoute } from "@tanstack/react-router";

import { AgencyProjectDetailPage } from "@/pages/agency-project-detail-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/projects/$projectId")({
  component: AgencyProjectDetailPage,
  head: () => ({
    meta: [{ title: "Project — Orch" }],
  }),
});
