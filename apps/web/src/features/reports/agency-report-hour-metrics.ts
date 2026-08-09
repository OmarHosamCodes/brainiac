import {
  isReportEntryWaste,
  type AggregatedReportRow,
} from "@/features/reports/agency-report-grouping";

export type ReportHourClient = {
  id: string;
  category?: "internal" | "external" | null;
};

export type ReportHourEntry = {
  clientId: string;
  durationSeconds: number;
  projectName: string;
  taskTitle: string | null;
  taskIsWaste: boolean | null;
  isWaste?: boolean;
  isBillable?: boolean;
};

export type ReportHourMetrics = {
  totalSeconds: number;
  externalSeconds: number;
  internalSeconds: number;
  internalBillableSeconds: number;
  paidSeconds: number;
  wasteSeconds: number;
  entryCount: number;
};

export function computeReportHourMetrics(
  entries: readonly ReportHourEntry[],
  clients: readonly ReportHourClient[],
): ReportHourMetrics {
  const categoryById = new Map(
    clients.map((client) => [client.id, client.category ?? undefined] as const),
  );
  let externalSeconds = 0;
  let internalSeconds = 0;
  let internalBillableSeconds = 0;
  let wasteSeconds = 0;

  for (const entry of entries) {
    // ponytail: entries do not carry clientCategory; unknown ids count as external. Upgrade: add category on the time-entry wire record.
    const category = categoryById.get(entry.clientId) ?? "external";
    if (category === "internal") {
      internalSeconds += entry.durationSeconds;
      if (entry.isBillable !== false) {
        internalBillableSeconds += entry.durationSeconds;
      }
      continue;
    }

    externalSeconds += entry.durationSeconds;
    if (
      isReportEntryWaste({
        projectName: entry.projectName,
        taskTitle: entry.taskTitle,
        taskIsWaste: entry.taskIsWaste,
        isWaste: entry.isWaste === true,
      })
    ) {
      wasteSeconds += entry.durationSeconds;
    }
  }

  return {
    totalSeconds: externalSeconds + internalSeconds,
    externalSeconds,
    internalSeconds,
    internalBillableSeconds,
    paidSeconds: Math.max(0, externalSeconds - wasteSeconds),
    wasteSeconds,
    entryCount: entries.length,
  };
}

export function metricsForAggregatedRows(
  rows: readonly AggregatedReportRow[],
  clients: readonly ReportHourClient[],
): ReportHourMetrics {
  return computeReportHourMetrics(
    rows.flatMap((row) => row.entries),
    clients,
  );
}
