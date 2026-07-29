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
  isReportEntryWaste,
  type AgencyReportEntry,
  type AggregatedReportRow,
  type DisplayClientGroup,
} from "@/features/reports/agency-report-grouping";
import {
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";
import { DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES } from "@/features/reports/agency-report-merge-tasks";
import {
  applyClientBanner,
  applyDataRow,
  applyGrandTotal,
  applyHeaderRow,
  applyProjectMergeAccent,
  resolveExportColumnWidths,
  type AgencyReportExportSheet,
} from "@/features/reports/export-agency-report-xlsx-styles";
import { formatDuration } from "@/lib/utils/format-duration";

export type AgencyReportExportMode = "combined" | "per-client";

export type AgencyReportExportFile = {
  fileName: string;
  blob: Blob;
};

type ExportAgencyReportXlsxInput = {
  teamId: string;
  reportName?: string;
  entries: AgencyReportEntry[];
  excludedEntryIds: Set<string>;
  entryOverrides: Map<string, Partial<AgencyTimeEntry>>;
  visibleFields?: AgencyReportFieldId[];
  showWaste?: AgencyReportShowWaste;
  mergeSameTaskNames?: boolean;
};

type AgencyReportExportJob = {
  fileName: string;
  clientGroups: DisplayClientGroup[];
};

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

export function resolveAgencyReportExportBaseName(teamId: string, reportName?: string): string {
  return reportName ? sanitizeReportFileName(reportName) : `agency-report-${teamId}`;
}

export function buildAgencyReportExportFileName(
  baseName: string,
  dateStamp: string,
  clientName?: string,
): string {
  if (!clientName) return `${baseName}-${dateStamp}.xlsx`;
  return `${baseName}-${sanitizeReportFileName(clientName)}-${dateStamp}.xlsx`;
}

/** Pure planner: one job for combined, one job per client for per-client. */
export function planAgencyReportExportJobs(
  clientGroups: DisplayClientGroup[],
  mode: AgencyReportExportMode,
  baseName: string,
  dateStamp: string,
): AgencyReportExportJob[] {
  if (mode === "combined") {
    return [
      {
        fileName: buildAgencyReportExportFileName(baseName, dateStamp),
        clientGroups,
      },
    ];
  }
  return clientGroups.map((clientGroup) => ({
    fileName: buildAgencyReportExportFileName(baseName, dateStamp, clientGroup.clientName),
    clientGroups: [clientGroup],
  }));
}

async function writeWorkbookBlob(
  clientGroups: DisplayClientGroup[],
  activeFields: AgencyReportFieldId[],
): Promise<Blob> {
  // ponytail: dynamic import keeps exceljs off the main bundle; upgrade path is a dedicated export chunk route
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  // ExcelJS cell style types are Partial<> and not assignable to our write helpers.
  const exportSheet = sheet as unknown as AgencyReportExportSheet;
  const columnCount = Math.max(activeFields.length, 1);
  const projectColumnIndex = activeFields.indexOf("project");

  sheet.columns = resolveExportColumnWidths(activeFields);

  let rowIndex = 1;
  let dataRowOrdinal = 0;

  for (const clientGroup of clientGroups) {
    applyClientBanner(
      exportSheet,
      rowIndex,
      columnCount,
      clientGroup.clientName,
      formatDuration(clientGroup.totalSeconds, "clock"),
    );
    rowIndex += 1;

    const headerRow = exportSheet.getRow(rowIndex);
    headerRow.values = activeFields.map((field) => AGENCY_REPORT_FIELD_LABELS[field]);
    applyHeaderRow(headerRow, columnCount);
    rowIndex += 1;

    for (const [projectIndex, project] of clientGroup.projects.entries()) {
      const projectStartRow = rowIndex;

      for (const [entryIndex, entry] of project.rows.entries()) {
        const dataRow = exportSheet.getRow(rowIndex);
        dataRow.values = activeFields.map((field) =>
          reportFieldValue(field, entry, project.projectName, entryIndex),
        );
        applyDataRow(dataRow, activeFields, {
          zebra: dataRowOrdinal % 2 === 1,
          isWaste: isReportEntryWaste(entry),
        });
        dataRowOrdinal += 1;
        rowIndex += 1;
      }

      if (projectColumnIndex >= 0 && project.rows.length > 1) {
        applyProjectMergeAccent(exportSheet, projectStartRow, rowIndex - 1, projectColumnIndex);
      }

      // Blank spacer between projects (not after the last in the client).
      if (projectIndex < clientGroup.projects.length - 1) {
        rowIndex += 1;
      }
    }

    // Extra blank row between clients for breathing room.
    rowIndex += 2;
  }

  const grandTotalSeconds = clientGroups.reduce((sum, group) => sum + group.totalSeconds, 0);
  if (clientGroups.length > 0) {
    // Back up past the trailing spacers so the total sits one blank below the last client block.
    const totalRow = Math.max(1, rowIndex - 1);
    applyGrandTotal(exportSheet, totalRow, columnCount, formatDuration(grandTotalSeconds, "clock"));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}

async function exportAgencyReportFiles(
  input: ExportAgencyReportXlsxInput,
  mode: AgencyReportExportMode,
): Promise<AgencyReportExportFile[]> {
  const {
    teamId,
    reportName,
    entries,
    excludedEntryIds,
    entryOverrides,
    visibleFields,
    showWaste = DEFAULT_AGENCY_REPORT_SHOW_WASTE,
    mergeSameTaskNames = DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES,
  } = input;

  const exportEntries = resolveExportEntries(entries, excludedEntryIds, entryOverrides, showWaste);
  const clientGroups = groupEntriesForDisplay(exportEntries, { mergeSameTaskNames });
  const activeFields = resolveActiveReportFields(visibleFields);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = resolveAgencyReportExportBaseName(teamId, reportName);
  const jobs = planAgencyReportExportJobs(clientGroups, mode, baseName, dateStamp);

  const files: AgencyReportExportFile[] = [];
  for (const job of jobs) {
    files.push({
      fileName: job.fileName,
      blob: await writeWorkbookBlob(job.clientGroups, activeFields),
    });
  }
  return files;
}

export async function exportAgencyReportXlsx(
  input: ExportAgencyReportXlsxInput,
): Promise<AgencyReportExportFile> {
  const [file] = await exportAgencyReportFiles(input, "combined");
  return (
    file ?? {
      fileName: buildAgencyReportExportFileName(
        resolveAgencyReportExportBaseName(input.teamId, input.reportName),
        new Date().toISOString().slice(0, 10),
      ),
      blob: new Blob([], { type: XLSX_MIME }),
    }
  );
}

export async function exportAgencyReportXlsxPerClient(
  input: ExportAgencyReportXlsxInput,
): Promise<AgencyReportExportFile[]> {
  return exportAgencyReportFiles(input, "per-client");
}
