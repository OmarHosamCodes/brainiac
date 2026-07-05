import { orpcClient } from "@/lib/orpc";
import type { AgencyReportEntry } from "@/lib/utils/agency-report-grouping";

export type ReportEntryFilters = {
  clientId?: string;
  projectId?: string;
  memberUserId?: string;
};

const ENTRIES_PAGE_SIZE = 100;

// ponytail: sequential page fetches; upgrade path is a bulk reports.entries endpoint.
export async function fetchAllReportEntries(
  teamId: string,
  range: { from: string; to: string },
  filters: ReportEntryFilters,
): Promise<AgencyReportEntry[]> {
  const items: AgencyReportEntry[] = [];
  let page = 1;

  while (true) {
    const result = await orpcClient.agencyOps.reports.listEntries({
      teamId,
      from: range.from,
      to: range.to,
      clientId: filters.clientId,
      projectId: filters.projectId,
      memberUserId: filters.memberUserId,
      page,
      pageSize: ENTRIES_PAGE_SIZE,
    });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length < ENTRIES_PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return items;
}
