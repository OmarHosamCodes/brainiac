import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/brainiac";

const [{ db }, { notification, user }, teamService, service] = await Promise.all([
  import("@brainiac/db"),
  import("@brainiac/db/schema"),
  import("../team/service"),
  import("./service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-notification-${crypto.randomUUID()}`;
  const email = `${id}@example.test`;
  await db.insert(user).values({
    id,
    name: "Notification Integration User",
    email,
  });
  fixtureUsers.push(id);
  return { id, email };
}

describe("notification service authorization", () => {
  test("does not expose or mutate another recipient's notification", async () => {
    const owner = await createFixtureUser();
    const recipient = await createFixtureUser();
    const teammate = await createFixtureUser();
    const nonMember = await createFixtureUser();
    const team = await teamService.createTeam(owner.id, { name: "Notification Team" });
    await teamService.addTeamMember(owner.id, {
      teamId: team.id,
      userEmail: recipient.email,
      role: "viewer",
    });
    await teamService.addTeamMember(owner.id, {
      teamId: team.id,
      userEmail: teammate.email,
      role: "viewer",
    });

    const notificationId = `notification_${crypto.randomUUID()}`;
    await db.insert(notification).values({
      id: notificationId,
      teamId: team.id,
      recipientUserId: recipient.id,
      actorUserId: owner.id,
      type: "task.assigned",
      payload: { taskId: "task-owner-only", taskTitle: "Owner-only task" },
    });

    expect((await service.listNotifications(recipient.id, { teamId: team.id })).items).toHaveLength(
      1,
    );
    expect((await service.listNotifications(teammate.id, { teamId: team.id })).items).toHaveLength(
      0,
    );
    await expect(
      service.listNotifications(nonMember.id, { teamId: team.id }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      service.markNotificationRead(teammate.id, {
        teamId: team.id,
        notificationId,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await service.markNotificationsSeen(teammate.id, { teamId: team.id })).toEqual({
      updated: true,
    });

    const [recipientNotification] = (
      await service.listNotifications(recipient.id, { teamId: team.id })
    ).items;
    expect(recipientNotification).toMatchObject({
      id: notificationId,
      recipientUserId: recipient.id,
      readAt: null,
      seenAt: null,
    });
  });

  test("does not transfer or unsubscribe another user's push endpoint", async () => {
    const owner = await createFixtureUser();
    const attacker = await createFixtureUser();
    const endpoint = `https://push.example.test/${crypto.randomUUID()}`;

    expect(
      await service.subscribePush(owner.id, {
        endpoint,
        p256dh: "owner-p256dh",
        auth: "owner-auth",
      }),
    ).toEqual({ subscribed: true });

    await expect(
      service.subscribePush(attacker.id, {
        endpoint,
        p256dh: "attacker-p256dh",
        auth: "attacker-auth",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await service.listPushSubscriptionsForUser(attacker.id, {})).toHaveLength(0);
    expect(await service.unsubscribePush(attacker.id, { endpoint })).toEqual({
      unsubscribed: true,
    });
    expect(await service.listPushSubscriptionsForUser(owner.id, {})).toEqual([
      expect.objectContaining({
        endpoint,
        p256dh: "owner-p256dh",
        auth: "owner-auth",
      }),
    ]);

    expect(
      await service.subscribePush(owner.id, {
        endpoint,
        p256dh: "owner-p256dh-updated",
        auth: "owner-auth-updated",
      }),
    ).toEqual({ subscribed: true });
    expect(await service.listPushSubscriptionsForUser(owner.id, {})).toEqual([
      expect.objectContaining({
        endpoint,
        p256dh: "owner-p256dh-updated",
        auth: "owner-auth-updated",
      }),
    ]);
  });
});
