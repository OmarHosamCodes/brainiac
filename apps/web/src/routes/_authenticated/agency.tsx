import { createFileRoute } from "@tanstack/react-router";

import { AgencyPage } from "@/pages/agency-page";
import { validateLooseSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/agency")({
  validateSearch: validateLooseSearch,
  component: AgencyPage,
  head: () => ({
    meta: [{ title: "Agency — Orch" }],
  }),
});
