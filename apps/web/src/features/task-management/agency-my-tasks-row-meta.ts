import { formatEstimateMinutes } from "@/features/task-management/agency-task-estimate";

export type MyTasksAssignerDisplay =
  | { kind: "me" }
  | { kind: "member"; userId: string; userName: string; userAvatar: string | null };

export function resolveMyTasksAssigner(args: {
  createdByUserId: string;
  actorUserId: string;
  member: { userId: string; userName: string; userAvatar: string | null } | null;
}): MyTasksAssignerDisplay {
  if (args.createdByUserId && args.createdByUserId === args.actorUserId) {
    return { kind: "me" };
  }
  if (args.member) {
    return {
      kind: "member",
      userId: args.member.userId,
      userName: args.member.userName,
      userAvatar: args.member.userAvatar,
    };
  }
  return {
    kind: "member",
    userId: args.createdByUserId,
    userName: "Unknown",
    userAvatar: null,
  };
}

export type MyTasksTimeConsumerDisplay = {
  trackedLabel: string;
  estimateLabel: string;
  ratio: number;
  overdue: boolean;
  ariaLabel: string;
};

export function buildMyTasksTimeConsumer(args: {
  totalTrackedSeconds?: number | null;
  estimateMinutes?: number | null;
}): MyTasksTimeConsumerDisplay | null {
  const estimateMinutes = args.estimateMinutes ?? null;
  if (estimateMinutes === null || estimateMinutes <= 0) return null;

  const trackedSeconds = Math.max(0, Math.floor(args.totalTrackedSeconds ?? 0));
  const estimateSeconds = estimateMinutes * 60;
  const trackedMinutes = Math.floor(trackedSeconds / 60);
  const overdue = trackedSeconds > estimateSeconds;
  const ratio = Math.min(1, trackedSeconds / estimateSeconds);
  const trackedLabel = formatEstimateMinutes(trackedMinutes);
  const estimateLabel = formatEstimateMinutes(estimateMinutes);
  const ariaLabel = overdue
    ? `${trackedLabel} of ${estimateLabel} estimated, over estimate`
    : `${trackedLabel} of ${estimateLabel} estimated`;

  return { trackedLabel, estimateLabel, ratio, overdue, ariaLabel };
}
