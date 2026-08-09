import { createFileRoute } from "@tanstack/react-router";

import { AgencyMemberProfilePage } from "@/pages/agency-member-profile-page";
import { validateLooseSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/agency/members/$userId")({
  validateSearch: validateLooseSearch,
  component: AgencyMemberProfilePage,
  head: () => ({
    meta: [{ title: "Member — Orch" }],
  }),
});
