import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

import {
  formatAgencyDayLabel,
  localDateKeyFromIso,
} from "@/features/time-tracking/format-agency-day-label";

export type AgencyTaskThreadTimelineItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; message: AgencyTaskMessage };

/** Insert WhatsApp-style day separators between chronologically ordered messages. */
export function buildAgencyTaskThreadTimeline(
  messages: AgencyTaskMessage[],
  referenceDate = new Date(),
): AgencyTaskThreadTimelineItem[] {
  const items: AgencyTaskThreadTimelineItem[] = [];
  let lastDayKey = "";

  for (const message of messages) {
    const dayKey = localDateKeyFromIso(message.createdAt);
    if (dayKey && dayKey !== lastDayKey) {
      items.push({
        kind: "day",
        key: dayKey,
        label: formatAgencyDayLabel(dayKey, referenceDate),
      });
      lastDayKey = dayKey;
    }
    items.push({ kind: "message", message });
  }

  return items;
}
