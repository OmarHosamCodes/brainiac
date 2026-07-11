/** True when a label contains "waste" as a word, any casing/format. */
export function isWasteLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /\bwaste\b/i.test(label);
}

/** Waste = task isWaste flag, or task/project name contains "waste". */
export function isReportEntryWaste(
  taskIsWaste: boolean | null | undefined,
  taskTitle: string | null | undefined,
  projectName: string | null | undefined,
): boolean {
  if (taskIsWaste === true) return true;
  return isWasteLabel(taskTitle) || isWasteLabel(projectName);
}

export type ProjectShareMetrics = {
  externalSeconds: number;
  internalSeconds: number;
  paidSeconds: number;
};

export function computeProjectShareMetrics(
  rows: Array<{
    durationSeconds: number;
    clientCategory: "internal" | "external";
    taskIsWaste: boolean | null;
    taskTitle: string | null;
    projectName: string;
  }>,
): ProjectShareMetrics {
  let externalSeconds = 0;
  let internalSeconds = 0;
  let externalWasteSeconds = 0;

  for (const row of rows) {
    if (row.clientCategory === "internal") {
      internalSeconds += row.durationSeconds;
      continue;
    }

    externalSeconds += row.durationSeconds;
    if (isReportEntryWaste(row.taskIsWaste, row.taskTitle, row.projectName)) {
      externalWasteSeconds += row.durationSeconds;
    }
  }

  return {
    externalSeconds,
    internalSeconds,
    // paid = external hours − waste on external clients
    paidSeconds: Math.max(0, externalSeconds - externalWasteSeconds),
  };
}
