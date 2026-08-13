import { describe, expect, test } from "bun:test";

import type { NotificationRecord } from "@orch/api/schemas/notifications";

import {
  buildMemberAlertOrchPrompt,
  featuredNotificationCta,
  featuredNotificationTitle,
  groupNotificationSections,
  isNeedsActionNotification,
  notificationHref,
  pickFeaturedNeedsAction,
  pickFeaturedRailItem,
} from "./notification-presentation";

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

  test("app update always outranks Needs-action in the rail", () => {
    const assigned = notification({
      id: "a",
      type: "task.assigned",
      deliveryClass: "interrupt",
    });
    expect(pickFeaturedRailItem([assigned], false)).toEqual({
      kind: "notification",
      featured: assigned,
      count: 1,
    });
    expect(pickFeaturedRailItem([assigned], true)).toEqual({
      kind: "app-update",
      featured: null,
      count: 2,
    });
    expect(pickFeaturedRailItem([], true)).toEqual({
      kind: "app-update",
      featured: null,
      count: 1,
    });
    expect(pickFeaturedRailItem([], false)).toEqual({
      kind: "empty",
      featured: null,
      count: 0,
    });
  });

  test("picks newest unread Needs-action and ignores Updates", () => {
    const picked = pickFeaturedNeedsAction([
      notification({
        id: "old",
        type: "task.assigned",
        deliveryClass: "interrupt",
        createdAt: "2026-08-04T09:00:00.000Z",
      }),
      notification({
        id: "update",
        type: "journey.milestone",
        deliveryClass: "center",
        createdAt: "2026-08-04T12:00:00.000Z",
      }),
      notification({
        id: "new",
        type: "member.alert",
        deliveryClass: "interrupt",
        createdAt: "2026-08-04T11:00:00.000Z",
      }),
    ]);
    expect(picked.count).toBe(2);
    expect(picked.featured?.id).toBe("new");
  });

  test("maps featured titles and CTA kinds", () => {
    expect(featuredNotificationTitle(notification({ id: "1", type: "task.assigned" }))).toBe(
      "Assigned task",
    );
    expect(featuredNotificationTitle(notification({ id: "2", type: "task.message" }))).toBe(
      "New reply",
    );
    expect(featuredNotificationTitle(notification({ id: "3", type: "member.alert" }))).toBe(
      "Profile alert",
    );

    expect(
      featuredNotificationCta(
        notification({
          id: "a",
          type: "task.assigned",
          payload: {
            taskId: "t1",
            projectId: "p1",
            taskTitle: "Ship",
            projectName: "Orch",
          },
        }),
      ),
    ).toEqual({ kind: "start-timer", label: "Start timer" });
    expect(
      featuredNotificationCta(
        notification({ id: "m", type: "task.message", payload: { taskId: "t1" } }),
      ),
    ).toEqual({ kind: "open", label: "Open task" });
    expect(featuredNotificationCta(notification({ id: "al", type: "member.alert" }))).toEqual({
      kind: "ask-orch",
      label: "Ask Orch",
    });
  });

  test("member.alert featured CTA is Ask Orch", () => {
    expect(
      featuredNotificationCta(
        notification({ type: "member.alert", payload: { alertTitle: "Waste spike" } }),
      ),
    ).toEqual({ kind: "ask-orch", label: "Ask Orch" });
  });

  test("seeds a plan prompt that forbids whole-day waste", () => {
    const prompt = buildMemberAlertOrchPrompt({
      title: "Waste spike",
      body: "Three entries look unfocused",
      dateKey: "2026-08-14",
    });
    expect(prompt).toContain("Waste spike");
    expect(prompt).toContain("2026-08-14");
    expect(prompt.toLowerCase()).toContain("targeted");
  });

  test("notificationHref uses canonical Agency paths", () => {
    expect(notificationHref(notification({ id: "1", type: "task.assigned" }))).toBe("/agency");
    expect(
      notificationHref(
        notification({ id: "2", type: "task.message", payload: { taskId: "tsk_1" } }),
      ),
    ).toBe("/agency?task=tsk_1");
    expect(
      notificationHref(
        notification({ id: "3", type: "journey.milestone", payload: { projectId: "prj_1" } }),
      ),
    ).toBe("/agency/projects/prj_1");
  });
});
