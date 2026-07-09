export const AGENCY_REPORT_FIELDS = [
  "project",
  "task",
  "description",
  "duration",
  "assignee",
] as const;

export type AgencyReportFieldId = (typeof AGENCY_REPORT_FIELDS)[number];

export const AGENCY_REPORT_FIELD_LABELS: Record<AgencyReportFieldId, string> = {
  project: "Project",
  task: "Task",
  description: "Description",
  duration: "Duration",
  assignee: "Assignee",
};

const fieldIdSet = new Set<string>(AGENCY_REPORT_FIELDS);

export function isAgencyReportFieldId(value: string): value is AgencyReportFieldId {
  return fieldIdSet.has(value);
}

export function allAgencyReportFieldIds(): AgencyReportFieldId[] {
  return [...AGENCY_REPORT_FIELDS];
}

export function areSameReportFieldSets(
  left: readonly AgencyReportFieldId[],
  right: readonly AgencyReportFieldId[],
): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((field) => leftSet.has(field));
}

export function normalizeReportFieldIds(
  fields: readonly string[] | undefined,
): AgencyReportFieldId[] {
  if (!fields?.length) return allAgencyReportFieldIds();
  const normalized = fields.filter(isAgencyReportFieldId);
  return normalized.length > 0 ? normalized : allAgencyReportFieldIds();
}

export function parseReportFieldsParam(value: string | null): AgencyReportFieldId[] {
  if (!value) return allAgencyReportFieldIds();
  return normalizeReportFieldIds(value.split(","));
}

export function serializeReportFieldsParam(fields: readonly AgencyReportFieldId[]): string {
  return fields.join(",");
}

export function isReportFieldVisible(
  fields: readonly AgencyReportFieldId[],
  field: AgencyReportFieldId,
): boolean {
  return fields.includes(field);
}

/** Row selection highlight applies to every column except project. */
export function isReportCreatorSelectionHighlightField(field: AgencyReportFieldId): boolean {
  return field !== "project";
}
