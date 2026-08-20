import type { WorkspaceTeamRole } from "@orch/workspace";

import { canPostTaskMessage } from "../task-messages/task-message-authz";

/** Assignees (or team-assigned) and editors/owners may edit task fields. */
export function canEditAgencyProjectTask(input: {
  assignedToTeam: boolean;
  assigneeUserIds: string[];
  actorUserId: string;
  actorRole: WorkspaceTeamRole;
}): boolean {
  if (input.actorRole === "editor" || input.actorRole === "owner") return true;
  return canPostTaskMessage({
    assignedToTeam: input.assignedToTeam,
    assigneeUserIds: input.assigneeUserIds,
    actorUserId: input.actorUserId,
  });
}
