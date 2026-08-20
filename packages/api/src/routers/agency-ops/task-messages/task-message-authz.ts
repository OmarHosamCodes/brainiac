export function canPostTaskMessage(input: {
  assignedToTeam: boolean;
  assigneeUserIds: string[];
  actorUserId: string;
}): boolean {
  if (input.assignedToTeam) return true;
  return input.assigneeUserIds.includes(input.actorUserId);
}
