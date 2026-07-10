import { describe, expect, test } from "bun:test";

import { applyMemberTaskCompletion } from "./agency-ops";

describe("applyMemberTaskCompletion", () => {
  test("two completes → same task id, count 2, member status done", () => {
    const taskId = "task-1";
    let member: { taskId: string; completionCount: number; status: "open" | "done" } = {
      taskId,
      completionCount: 0,
      status: "open",
    };

    member = { taskId, ...applyMemberTaskCompletion(member) };
    expect(member).toEqual({ taskId: "task-1", completionCount: 1, status: "done" });

    member = { taskId, ...applyMemberTaskCompletion(member) };
    expect(member).toEqual({ taskId: "task-1", completionCount: 2, status: "done" });
  });
});
