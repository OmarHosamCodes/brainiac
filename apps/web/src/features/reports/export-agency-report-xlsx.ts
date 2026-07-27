import type { AgencyTimeEntry } from "@orch/api/schemas/agency-ops";

import {
  AGENCY_REPORT_FIELD_LABELS,
  AGENCY_REPORT_FIELDS,
  allAgencyReportFieldIds,
  isReportFieldVisible,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { sanitizeReportFileName } from "@/features/reports/agency-report-naming";
import {
  groupEntriesForDisplay,
  filterEntriesByShowWaste,
  type AgencyReportEntry,
  type AggregatedReportRow,
} from "@/features/reports/agency-report-grouping";
import {
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";
import { formatDuration } from "@/lib/utils/format-duration";

type ExportAgencyReportXlsxInput = {
  teamId: string;
  reportName?: string;
  entries: AgencyReportEntry[];
  excludedEntryIds: Set<string>;
  entryOverrides: Map<string, Partial<AgencyTimeEntry>>;
  visibleFields?: AgencyReportFieldId[];
  showWaste?: AgencyReportShowWaste;
};

function resolveActiveReportFields(
  visibleFields: AgencyReportFieldId[] | undefined,
): AgencyReportFieldId[] {
  const normalized = visibleFields ?? allAgencyReportFieldIds();
  return AGENCY_REPORT_FIELDS.filter((field) => isReportFieldVisible(normalized, field));
}

function reportFieldValue(
  field: AgencyReportFieldId,
  entry: AggregatedReportRow,
  projectName: string,
  entryIndex: number,
): string {
  switch (field) {
    case "project":
      return entryIndex === 0 ? projectName : "";
    case "task":
      return entry.taskTitle || "—";
    case "description":
      return entry.description || "—";
    case "duration":
      return formatDuration(entry.durationSeconds, "clock");
    case "assignee":
      return entry.userName;
    default: {
      const unexpected: never = field;
      return unexpected;
    }
  }
}

function resolveExportEntries(
  entries: AgencyReportEntry[],
  excludedEntryIds: Set<string>,
  entryOverrides: Map<string, Partial<AgencyTimeEntry>>,
  showWaste: AgencyReportShowWaste,
): AgencyReportEntry[] {
  return filterEntriesByShowWaste(
    entries
      .filter((entry) => !excludedEntryIds.has(entry.id))
      .map((entry) => {
        const override = entryOverrides.get(entry.id);
        return override ? ({ ...entry, ...override } as AgencyReportEntry) : entry;
      }),
    showWaste,
  );
}

export async function exportAgencyReportXlsx({
  teamId,
  reportName,
  entries,
  excludedEntryIds,
  entryOverrides,
  visibleFields,
  showWaste = DEFAULT_AGENCY_REPORT_SHOW_WASTE,
}: ExportAgencyReportXlsxInput): Promise<{ fileName: string; blob: Blob }> {
  // ponytail: dynamic import keeps exceljs off the main bundle; upgrade path is a dedicated export chunk route
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  const exportEntries = resolveExportEntries(entries, excludedEntryIds, entryOverrides, showWaste);
  const clientGroups = groupEntriesForDisplay(exportEntries);
  const activeFields = resolveActiveReportFields(visibleFields);
  const columnCount = Math.max(activeFields.length, 1);
  const projectColumnIndex = activeFields.indexOf("project");

  sheet.columns = activeFields.map(() => ({ width: 20 }));

  let rowIndex = 1;

  for (const clientGroup of clientGroups) {
    const mergeEndColumn = Math.max(1, columnCount - 1);
    sheet.mergeCells(rowIndex, 1, rowIndex, mergeEndColumn);
    const clientHeader = sheet.getCell(rowIndex, 1);
    clientHeader.value = clientGroup.clientName;
    clientHeader.font = { bold: true, size: 12 };

    const clientTotal = sheet.getCell(rowIndex, columnCount);
    clientTotal.value = formatDuration(clientGroup.totalSeconds, "clock");
    clientTotal.font = { bold: true };
    clientTotal.alignment = { horizontal: "right" };
    rowIndex += 1;

    const headerRow = sheet.getRow(rowIndex);
    headerRow.values = activeFields.map((field) => AGENCY_REPORT_FIELD_LABELS[field]);
    headerRow.font = { bold: true, size: 10 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF4F4F5" },
    };
    rowIndex += 1;

    for (const project of clientGroup.projects) {
      const projectStartRow = rowIndex;

      for (const [entryIndex, entry] of project.rows.entries()) {
        const dataRow = sheet.getRow(rowIndex);
        dataRow.values = activeFields.map((field) =>
          reportFieldValue(field, entry, project.projectName, entryIndex),
        );
        rowIndex += 1;
      }

      if (projectColumnIndex >= 0 && project.rows.length > 1) {
        sheet.mergeCells(
          projectStartRow,
          projectColumnIndex + 1,
          rowIndex - 1,
          projectColumnIndex + 1,
        );
        sheet.getCell(projectStartRow, projectColumnIndex + 1).alignment = { vertical: "middle" };
      }
    }

    rowIndex += 1;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = reportName ? sanitizeReportFileName(reportName) : `agency-report-${teamId}`;
  const fileName = `${baseName}-${dateStamp}.xlsx`;

  return {
    fileName,
    blob: new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  };
}
