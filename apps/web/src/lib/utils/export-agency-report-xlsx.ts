import type { AgencyTimeEntry } from "@brainiac/api/schemas/agency-ops";

import {
  groupEntriesByClient,
  type AgencyReportEntry,
} from "@/lib/utils/agency-report-grouping";
import { formatDuration } from "@/lib/utils/format-duration";

type ExportAgencyReportXlsxInput = {
  teamId: string;
  entries: AgencyReportEntry[];
  excludedEntryIds: Set<string>;
  entryOverrides: Map<string, Partial<AgencyTimeEntry>>;
};

function resolveExportEntries(
  entries: AgencyReportEntry[],
  excludedEntryIds: Set<string>,
  entryOverrides: Map<string, Partial<AgencyTimeEntry>>,
): AgencyReportEntry[] {
  return entries
    .filter((entry) => !excludedEntryIds.has(entry.id))
    .map((entry) => {
      const override = entryOverrides.get(entry.id);
      return override ? ({ ...entry, ...override } as AgencyReportEntry) : entry;
    });
}

export async function exportAgencyReportXlsx({
  teamId,
  entries,
  excludedEntryIds,
  entryOverrides,
}: ExportAgencyReportXlsxInput): Promise<{ fileName: string; blob: Blob }> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  const exportEntries = resolveExportEntries(entries, excludedEntryIds, entryOverrides);
  const clientGroups = groupEntriesByClient(exportEntries);

  sheet.columns = [
    { width: 28 },
    { width: 40 },
    { width: 12 },
    { width: 18 },
  ];

  let rowIndex = 1;

  for (const clientGroup of clientGroups) {
    sheet.mergeCells(rowIndex, 1, rowIndex, 3);
    const clientHeader = sheet.getCell(rowIndex, 1);
    clientHeader.value = clientGroup.clientName;
    clientHeader.font = { bold: true, size: 12 };

    const clientTotal = sheet.getCell(rowIndex, 4);
    clientTotal.value = formatDuration(clientGroup.totalSeconds, "clock");
    clientTotal.font = { bold: true };
    clientTotal.alignment = { horizontal: "right" };
    rowIndex += 1;

    const headerRow = sheet.getRow(rowIndex);
    headerRow.values = ["Project", "Description", "Duration", "Assignee"];
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
        dataRow.values = [
          entryIndex === 0 ? project.projectName : "",
          entry.description || "—",
          formatDuration(entry.durationSeconds, "clock"),
          entry.userName,
        ];
        rowIndex += 1;
      }

      if (project.rows.length > 1) {
        sheet.mergeCells(projectStartRow, 1, rowIndex - 1, 1);
        sheet.getCell(projectStartRow, 1).alignment = { vertical: "middle" };
      }
    }

    rowIndex += 1;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `agency-report-${teamId}-${dateStamp}.xlsx`;

  return {
    fileName,
    blob: new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  };
}
