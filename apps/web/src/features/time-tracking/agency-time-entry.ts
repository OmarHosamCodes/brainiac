import { z } from "zod";

import {
  draftToIsoRange as draftToIsoRangeUtil,
  parseDurationInput,
} from "@/features/time-tracking/time-entry-draft";

export const timeEntryDraftSchema = z.object({
  taskId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationInput: z.string(),
  description: z.string(),
});

export type TimeEntryDraft = z.infer<typeof timeEntryDraftSchema>;

export function validateTimeEntryDraft(
  draft: TimeEntryDraft,
  options: { requireTask?: boolean } = {},
): string | null {
  if (options.requireTask !== false && !draft.taskId) {
    return "Select a task.";
  }

  const range = draftToIsoRangeUtil(draft);
  if ("error" in range) return range.error;
  if (range.durationSeconds <= 0) {
    return "End time must be after start time.";
  }

  return null;
}

export function parseTimeEntryDraftDuration(value: string): number | null {
  return parseDurationInput(value);
}

export { draftToIsoRangeUtil as draftToIsoRange };
