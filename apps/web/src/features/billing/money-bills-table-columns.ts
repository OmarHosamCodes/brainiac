import type { MoneyBillPersonGroup } from "./money-bill-obligation-rows";
import { formatMoneyBillPeriod } from "./money-bills-rows";

function periodKey(line: { periodStart: string; periodEnd: string }): string {
  return `${line.periodStart}\0${line.periodEnd}`;
}

function periodLabelFromLines(
  lines: ReadonlyArray<{ periodStart: string; periodEnd: string }>,
): string {
  if (lines.length === 0) return "";

  const keys = new Set(lines.map(periodKey));
  if (keys.size === 1) {
    const line = lines[0];
    if (!line) return "";
    return formatMoneyBillPeriod(line.periodStart, line.periodEnd);
  }

  return "Mixed";
}

export function moneyBillGroupCarryCount(group: Pick<MoneyBillPersonGroup, "lines">): number {
  return group.lines.filter((line) => line.isCarry).length;
}

export function moneyBillGroupPeriodLabel(group: Pick<MoneyBillPersonGroup, "lines">): string {
  const nonCarryLines = group.lines.filter((line) => !line.isCarry);
  const sourceLines = nonCarryLines.length > 0 ? nonCarryLines : group.lines;
  return periodLabelFromLines(sourceLines);
}

export function moneyBillTableShowsWaste(rows: ReadonlyArray<{ wasteAmount: number }>): boolean {
  return rows.some((row) => row.wasteAmount > 0);
}
