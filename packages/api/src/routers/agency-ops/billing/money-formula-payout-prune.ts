import type { AgencyOpsPayoutRunStatus } from "@orch/db/schema";

import {
  isAdjustmentSectionKey,
  isFormulaSyncedPayoutSection,
  isPayoutSectionKey,
} from "./payout-section-keys";

export function sectionFormulaKey(formulaId: string, sectionKey: string): string {
  return `${formulaId}:${sectionKey}`;
}

export function shouldRefreshFormulaSnapshot(input: {
  hasPinnedSnapshot: boolean;
  refreshSnapshot: boolean;
  runStatus: AgencyOpsPayoutRunStatus;
}): boolean {
  return !input.hasPinnedSnapshot || (input.refreshSnapshot && input.runStatus === "draft");
}

export function liveSectionFormulaKeys(
  formulas: ReadonlyArray<{ id: string; enabled: boolean; sectionKey: string | null }>,
): Set<string> {
  const keys = new Set<string>();
  for (const formula of formulas) {
    if (!formula.enabled || formula.sectionKey == null) continue;
    if (!isPayoutSectionKey(formula.sectionKey)) continue;
    if (!isFormulaSyncedPayoutSection(formula.sectionKey)) continue;
    keys.add(sectionFormulaKey(formula.id, formula.sectionKey));
  }
  return keys;
}

export function payoutLineMayDelete(input: {
  sectionKey: string;
  sourceFormulaId: string | null;
  enabledSectionFormulaKeys: ReadonlySet<string>;
}): boolean {
  if (!isAdjustmentSectionKey(input.sectionKey)) return false;
  if (!input.sourceFormulaId) return true;
  return !input.enabledSectionFormulaKeys.has(
    sectionFormulaKey(input.sourceFormulaId, input.sectionKey),
  );
}

/** Draft formula lines whose formula/section is no longer enabled. Paid/partial stay until dismissed. */
export function staleFormulaPayoutLineIds(input: {
  lines: ReadonlyArray<{
    id: string;
    sourceFormulaId: string | null;
    sectionKey: string;
    status: "draft" | "partial" | "paid";
  }>;
  enabledSectionFormulaKeys: ReadonlySet<string>;
}): string[] {
  return input.lines
    .filter((line) => {
      if (!line.sourceFormulaId) return false;
      if (line.status !== "draft") return false;
      return !input.enabledSectionFormulaKeys.has(
        sectionFormulaKey(line.sourceFormulaId, line.sectionKey),
      );
    })
    .map((line) => line.id);
}
