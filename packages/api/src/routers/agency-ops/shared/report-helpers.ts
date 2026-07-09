import { and, inArray, eq } from "drizzle-orm";
import { agencyOpsProject, agencyOpsTimeEntry } from "@brainiac/db/schema";

export type ReportEntityFilterInput = {
  clientId?: string;
  projectId?: string;
  memberUserId?: string;
  clientIds?: string[];
  projectIds?: string[];
  memberUserIds?: string[];
};

export type AgencyClientArchiveFilter = "all" | "archived" | "nonarchived";

export function resolveReportEntityIds(
  singular: string | undefined,
  plural: string[] | undefined,
): string[] {
  if (plural && plural.length > 0) return plural;
  if (singular) return [singular];
  return [];
}

export function applyReportEntityFilters(
  filters: Parameters<typeof and>[0][],
  input: ReportEntityFilterInput,
) {
  const clientIds = resolveReportEntityIds(input.clientId, input.clientIds);
  if (clientIds.length === 1) {
    filters.push(eq(agencyOpsProject.clientId, clientIds[0]!));
  } else if (clientIds.length > 1) {
    filters.push(inArray(agencyOpsProject.clientId, clientIds));
  }

  const projectIds = resolveReportEntityIds(input.projectId, input.projectIds);
  if (projectIds.length === 1) {
    filters.push(eq(agencyOpsProject.id, projectIds[0]!));
  } else if (projectIds.length > 1) {
    filters.push(inArray(agencyOpsProject.id, projectIds));
  }

  const memberUserIds = resolveReportEntityIds(input.memberUserId, input.memberUserIds);
  if (memberUserIds.length === 1) {
    filters.push(eq(agencyOpsTimeEntry.userId, memberUserIds[0]!));
  } else if (memberUserIds.length > 1) {
    filters.push(inArray(agencyOpsTimeEntry.userId, memberUserIds));
  }
}
