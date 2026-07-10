import type { NotificationPayload } from "@brainiac/db/schema";

import {
  fanOutNotification,
  listTaskThreadParticipantUserIds,
  listTeamMemberUserIds,
} from "./service";

export async function notifyTaskAssigned(input: {
  teamId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  assigneeUserIds: string[];
  assignedToTeam: boolean;
}) {
  const recipients = input.assignedToTeam
    ? await listTeamMemberUserIds(input.actorUserId, { teamId: input.teamId })
    : input.assigneeUserIds;

  await fanOutNotification(input.actorUserId, {
    teamId: input.teamId,
    recipientUserIds: recipients,
    type: "task.assigned",
    payload: {
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      projectId: input.projectId,
      projectName: input.projectName,
    },
  });
}

export async function notifyTaskMessage(input: {
  teamId: string;
  actorUserId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  messageId: string;
  messagePreview: string;
  assigneeUserIds: string[];
}) {
  const participants = await listTaskThreadParticipantUserIds(input.actorUserId, {
    teamId: input.teamId,
    taskId: input.taskId,
  });
  const recipients = [...new Set([...input.assigneeUserIds, ...participants])];

  await fanOutNotification(input.actorUserId, {
    teamId: input.teamId,
    recipientUserIds: recipients,
    type: "task.message",
    payload: {
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      projectId: input.projectId,
      projectName: input.projectName,
      messageId: input.messageId,
      messagePreview: input.messagePreview,
      messageCount: 1,
    },
  });
}

export async function notifyJourneyMilestone(input: {
  teamId: string;
  actorUserId: string | null;
  projectId: string;
  projectName: string;
  journeyStepId: string;
  journeyStepLabel: string;
}) {
  const recipients = await listTeamMemberUserIds(input.actorUserId, { teamId: input.teamId });

  await fanOutNotification(input.actorUserId, {
    teamId: input.teamId,
    recipientUserIds: recipients,
    type: "journey.milestone",
    payload: {
      projectId: input.projectId,
      projectName: input.projectName,
      journeyStepId: input.journeyStepId,
      journeyStepLabel: input.journeyStepLabel,
    },
  });
}

export async function notifyTimerActivity(input: {
  teamId: string;
  actorUserId: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  timerAction: "started" | "stopped";
}) {
  const recipients = await listTeamMemberUserIds(input.actorUserId, { teamId: input.teamId });
  const payload: NotificationPayload = {
    projectId: input.projectId,
    projectName: input.projectName,
    timerAction: input.timerAction,
  };

  if (input.taskId) {
    payload.taskId = input.taskId;
    payload.taskTitle = input.taskTitle ?? undefined;
  }

  await fanOutNotification(input.actorUserId, {
    teamId: input.teamId,
    recipientUserIds: recipients,
    type: "timer.activity",
    payload,
  });
}
