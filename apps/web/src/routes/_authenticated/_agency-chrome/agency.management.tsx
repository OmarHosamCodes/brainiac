import { createFileRoute } from "@tanstack/react-router";

import { AgencyManagementLayoutPage } from "@/pages/agency-management-layout-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/management")({
  component: AgencyManagementLayoutPage,
  head: () => ({
    meta: [{ title: "Management — Orch" }],
  }),
});
