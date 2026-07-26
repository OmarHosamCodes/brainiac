/** True when a label contains "waste" as a word, any casing/format. */
export function isWasteLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /\bwaste\b/i.test(label);
}

/** Waste = entry isWaste flag, task isWaste flag, or task/project name contains "waste". */
export function isReportEntryWaste(
  taskIsWaste: boolean | null | undefined,
  taskTitle: string | null | undefined,
  projectName: string | null | undefined,
  entryIsWaste?: boolean | null,
): boolean {
  if (entryIsWaste === true) return true;
  if (taskIsWaste === true) return true;
  return isWasteLabel(taskTitle) || isWasteLabel(projectName);
}

export type ProjectShareMetrics = {
  externalSeconds: number;
  internalSeconds: number;
  /** Internal hours with isBillable=true. */
  internalBillableSeconds: number;
  paidSeconds: number;
};

export function computeProjectShareMetrics(
  rows: Array<{
    durationSeconds: number;
    clientCategory: "internal" | "external";
    taskIsWaste: boolean | null;
    taskTitle: string | null;
    projectName: string;
    isBillable?: boolean;
    isWaste?: boolean;
  }>,
): ProjectShareMetrics {
  let externalSeconds = 0;
  let internalSeconds = 0;
  let internalBillableSeconds = 0;
  let externalWasteSeconds = 0;

  for (const row of rows) {
    if (row.clientCategory === "internal") {
      internalSeconds += row.durationSeconds;
      if (row.isBillable !== false) {
        internalBillableSeconds += row.durationSeconds;
      }
      continue;
    }

    externalSeconds += row.durationSeconds;
    if (isReportEntryWaste(row.taskIsWaste, row.taskTitle, row.projectName, row.isWaste)) {
      externalWasteSeconds += row.durationSeconds;
    }
  }

  return {
    externalSeconds,
    internalSeconds,
    internalBillableSeconds,
    // paid = external hours − waste on external clients
    paidSeconds: Math.max(0, externalSeconds - externalWasteSeconds),
  };
}
