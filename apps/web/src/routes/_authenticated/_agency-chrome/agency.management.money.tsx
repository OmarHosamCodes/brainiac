import { createFileRoute } from "@tanstack/react-router";

import { AgencyManagementMoneyPage } from "@/pages/agency-management-money-page";
import { validatePeriodSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/management/money")({
  validateSearch: validatePeriodSearch,
  component: AgencyManagementMoneyPage,
  head: () => ({
    meta: [{ title: "Money — Orch" }],
  }),
});
