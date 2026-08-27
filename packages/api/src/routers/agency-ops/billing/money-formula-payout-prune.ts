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
      return !input.enabledSectionFormulaKeys.has(`${line.sourceFormulaId}:${line.sectionKey}`);
    })
    .map((line) => line.id);
}
