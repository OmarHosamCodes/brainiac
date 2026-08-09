import { describe, expect, test } from "bun:test";

import type { NotificationRecord } from "../../schemas/notifications";
import { buildNotificationUrl } from "./copy";

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

describe("buildNotificationUrl", () => {
  test("uses canonical Agency paths, not query pages", () => {
    expect(buildNotificationUrl(notification({ id: "1", type: "task.assigned" }))).toBe("/agency");
    expect(
      buildNotificationUrl(
        notification({ id: "1b", type: "task.message", payload: { taskId: "tsk_1" } }),
      ),
    ).toBe("/agency?task=tsk_1");
    expect(
      buildNotificationUrl(
        notification({
          id: "2",
          type: "journey.milestone",
          payload: { projectId: "prj_1" },
        }),
      ),
    ).toBe("/agency/projects/prj_1");
    expect(buildNotificationUrl(notification({ id: "3", type: "timer.activity" }))).toBe(
      "/agency/dashboard",
    );
    expect(buildNotificationUrl(notification({ id: "4", type: "team.digest" }))).toBe(
      "/agency/reports",
    );
    expect(
      buildNotificationUrl(
        notification({
          id: "5",
          type: "member.alert",
          payload: { subjectUserId: "u1", alertId: "a1", dateKey: "2026-08-01" },
        }),
      ),
    ).toBe("/agency/members/u1?focus=alerts&alertId=a1&day=2026-08-01");
    expect(buildNotificationUrl(notification({ id: "6", type: "member.alert" }))).toBe(
      "/agency/management/people",
    );
  });
});
