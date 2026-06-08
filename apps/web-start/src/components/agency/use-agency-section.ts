import { useSearch } from "@tanstack/react-router";

import { parseAgencySearch } from "@/hooks/use-agency-search";

export function useAgencySection() {
  return parseAgencySearch(useSearch({ from: "/agency" }));
}
