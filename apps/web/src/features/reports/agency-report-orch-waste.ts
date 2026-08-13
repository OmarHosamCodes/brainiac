export function buildWasteOrchPrompt(input: {
  entryId: string;
  description: string;
  durationLabel: string;
}) {
  return `Propose time_entry.update isWaste true for only this entry (${input.entryId}, "${input.description}", ${input.durationLabel}). Do not mark other entries, a day, or a group. Then ui_present before/after and wait for Approve.`;
}
