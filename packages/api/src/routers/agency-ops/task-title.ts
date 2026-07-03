export { normalizeTaskTitle } from "../../schemas/agency-ops";

export type MemberStatus = "open" | "in_progress" | "done";

const MEMBER_STATUS_RANK: Record<MemberStatus, number> = {
  open: 0,
  in_progress: 1,
  done: 2,
};

/** Prefer the more progressed member status when merging duplicate tasks. */
export function preferMemberStatus(current: MemberStatus, incoming: MemberStatus): MemberStatus {
  return MEMBER_STATUS_RANK[incoming] > MEMBER_STATUS_RANK[current] ? incoming : current;
}

export type AssigneeMergePlan =
  | { kind: "team" }
  | { kind: "add"; userIds: string[] }
  | { kind: "noop" };

/** Decide how create-with-existing-title should update assignees. */
export function planAssigneeMerge(input: {
  existingAssignedToTeam: boolean;
  existingAssigneeIds: string[];
  wantAssignedToTeam: boolean;
  wantAssigneeIds: string[];
}): AssigneeMergePlan {
  if (input.existingAssignedToTeam || input.wantAssignedToTeam) {
    return input.existingAssignedToTeam ? { kind: "noop" } : { kind: "team" };
  }

  const existing = new Set(input.existingAssigneeIds);
  const userIds = [...new Set(input.wantAssigneeIds)].filter((userId) => !existing.has(userId));
  if (userIds.length === 0) return { kind: "noop" };
  return { kind: "add", userIds };
}
