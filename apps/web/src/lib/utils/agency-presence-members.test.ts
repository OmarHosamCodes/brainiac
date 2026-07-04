import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
}));

const { mergeAgencyPresenceMembers } = await import("./agency-presence-members");

describe("mergeAgencyPresenceMembers", () => {
  test("adds the active timer user when listActiveMembers is still empty", () => {
    const members = mergeAgencyPresenceMembers(
      [],
      {
        teamId: "team-1",
        userId: "user-1",
        projectName: "Project Alpha",
        description: "Working",
        startedAt: "2026-07-04T12:00:00.000Z",
      },
      "team-1",
      { id: "user-1", name: "Omar", image: null },
    );

    expect(members).toHaveLength(1);
    expect(members[0]?.userName).toBe("Omar");
    expect(members[0]?.projectName).toBe("Project Alpha");
  });

  test("does not duplicate a member already returned by listActiveMembers", () => {
    const members = mergeAgencyPresenceMembers(
      [
        {
          userId: "user-1",
          userName: "Omar",
          userAvatar: null,
          projectName: "Project Alpha",
          description: "Working",
          startedAt: "2026-07-04T12:00:00.000Z",
        },
      ],
      {
        teamId: "team-1",
        userId: "user-1",
        projectName: "Project Alpha",
        description: "Working",
        startedAt: "2026-07-04T12:00:00.000Z",
      },
      "team-1",
      { id: "user-1", name: "Omar", image: null },
    );

    expect(members).toHaveLength(1);
  });
});
