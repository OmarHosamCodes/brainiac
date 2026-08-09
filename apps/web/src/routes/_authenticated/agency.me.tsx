import { createFileRoute } from "@tanstack/react-router";

import { AgencyMemberProfilePage } from "@/pages/agency-member-profile-page";
import { validateLooseSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/agency/me")({
  validateSearch: validateLooseSearch,
  component: AgencyMemberProfilePage,
  head: () => ({
    meta: [{ title: "My profile — Orch" }],
  }),
});
