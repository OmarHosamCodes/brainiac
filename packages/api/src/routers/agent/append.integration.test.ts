import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const realAgent = await import("@orch/agent");
const runDashboardAgent = mock(async () => ({
  response: "The sprint plan is ready.",
  model: "test-model",
  toolsCalled: [],
  workspaceNodeCount: 0,
  usage: {
    modelId: "test-model",
    contextLength: null,
    inputTokens: 10,
    cachedTokens: 0,
    outputTokens: 8,
    reasoningTokens: 0,
    totalTokens: 18,
    costUsd: 0,
  },
  workspaceSnapshot: null,
}));

mock.module("@orch/agent", () => ({ ...realAgent, runDashboardAgent }));

const [{ db }, { user }, service] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
  import("./service"),
]);

const fixtureUsers: string[] = [];

beforeEach(() => {
  runDashboardAgent.mockClear();
});

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const userId = `integration-append-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id: userId,
    name: "Append Integration User",
    email: `${userId}@example.test`,
  });
  fixtureUsers.push(userId);
  return userId;
}

describe("dashboard agent append persistence", () => {
  test("persists user and assistant messages and usage from the agent runtime", async () => {
    const userId = await createFixtureUser();

    const result = await service.appendDashboardConversationTurn(userId, {
      actorUserName: "Append User",
      turn: {
        content: "Plan the next sprint",
        attachments: [],
        model: "test-model",
        toolPreset: "ask",
        surface: "canvas",
        nodes: [],
      },
    });

    expect(runDashboardAgent).toHaveBeenCalledTimes(1);
    expect(result.createdConversation).toBe(true);
    expect(result.userMessage.content).toBe("Plan the next sprint");
    expect(result.assistantMessage.content).toBe("The sprint plan is ready.");
    expect(result.conversation.usageSummary.totals.totalTokens).toBe(18);

    const detail = await service.getDashboardConversation(userId, {
      conversationId: result.conversation.id,
    });
    expect(detail.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  test("rejects appending to another user's conversation before invoking the agent runtime", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const conversation = await service.createDashboardConversation(ownerUserId, {
      content: "Owner-only conversation",
      model: "test-model",
      toolPreset: "ask",
    });

    await expect(
      service.appendDashboardConversationTurn(outsiderUserId, {
        actorUserName: "Outsider User",
        turn: {
          conversationId: conversation.id,
          content: "Append to the owner's conversation",
          attachments: [],
          model: "test-model",
          toolPreset: "ask",
          surface: "canvas",
          nodes: [],
        },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(runDashboardAgent).not.toHaveBeenCalled();
    expect(
      (await service.getDashboardConversation(ownerUserId, { conversationId: conversation.id }))
        .messages,
    ).toHaveLength(0);
  });
});
