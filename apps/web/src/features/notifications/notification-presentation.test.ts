import { describe, expect, test } from "bun:test";

import type { NotificationRecord } from "@orch/api/schemas/notifications";

import { groupNotificationSections, isNeedsActionNotification } from "./notification-presentation";

function notification(
  partial: Partial<NotificationRecord> & Pick<NotificationRecord, "id" | "type">,
): NotificationRecord {
  return {
    teamId: "team-1",
    recipientUserId: "user-1",
    actorUserId: "user-2",
    actorName: "Ada",
    actorAvatar: null,
    deliveryClass: null,
    payload: {},
    readAt: null,
    seenAt: null,
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    ...partial,
  };
}

describe("notification presentation", () => {
  test("treats unread assignments and messages as needs-action", () => {
    expect(
      isNeedsActionNotification(
        notification({ id: "1", type: "task.assigned", deliveryClass: "interrupt" }),
      ),
    ).toBe(true);
    expect(
      isNeedsActionNotification(
        notification({
          id: "2",
          type: "journey.milestone",
          deliveryClass: "center",
        }),
      ),
    ).toBe(false);
    expect(
      isNeedsActionNotification(
        notification({
          id: "3",
          type: "task.assigned",
          readAt: "2026-08-04T11:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  test("groups needs-action ahead of updates", () => {
    const sections = groupNotificationSections([
      notification({ id: "m", type: "journey.milestone", deliveryClass: "center" }),
      notification({ id: "a", type: "task.assigned", deliveryClass: "interrupt" }),
      notification({ id: "d", type: "team.digest", deliveryClass: "digest" }),
    ]);
    expect(sections.map((section) => section.label)).toEqual(["Needs action", "Updates"]);
    expect(sections[0]?.items.map((item) => item.id)).toEqual(["a"]);
    expect(sections[1]?.items.map((item) => item.id)).toEqual(["m", "d"]);
  });
});
