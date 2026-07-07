import { createWorkspaceId } from "@brainiac/workspace";

import type { SeedContext } from "./seed-agency-types";

export type AgencySeedScale = "default" | "massive";

export const MASSIVE_SCALE_TARGETS = {
  clients: 80,
  projects: 400,
  tasks: 3_000,
  messages: 15_000,
  timeEntries: 25_000,
  invoices: 80,
} as const;

const BATCH_SIZE = 500;

export async function insertInBatches<T>(
  rows: T[],
  insertChunk: (chunk: T[]) => Promise<void>,
  batchSize = BATCH_SIZE,
) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    await insertChunk(rows.slice(offset, offset + batchSize));
  }
}

function shiftDate(date: Date, options: { days?: number; hours?: number } = {}) {
  const { days = 0, hours = 0 } = options;
  return new Date(date.getTime() + days * 86_400_000 + hours * 3_600_000);
}

type ClientDef = {
  id: string;
  name: string;
  contact: { name: string; email: string; phone: string };
  archived?: boolean;
};

type ProjectDef = {
  id: string;
  clientId: string;
  name: string;
};

type SeedMessageDef = {
  id: string;
  userId: string;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: Date;
};

type TaskDef = {
  id: string;
  threadId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assignedToTeam?: boolean;
  assigneeUserIds: string[];
  dueDate: Date | null;
  messages: SeedMessageDef[];
  showcaseThread?: boolean;
};

type TimeEntryDef = {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  source: "timer" | "manual";
  description: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

type SeedDataBundle = {
  clients: ClientDef[];
  projects: ProjectDef[];
  tasks: TaskDef[];
  timeEntries: TimeEntryDef[];
};

const TASK_STATUSES: TaskDef["status"][] = ["open", "in_progress", "done", "archived"];
const TASK_TITLES = [
  "Review deliverables",
  "Client feedback round",
  "Update project timeline",
  "Prepare sprint demo",
  "QA pass",
  "Stakeholder sync",
  "Refine scope",
  "Ship milestone",
] as const;

export function resolveAgencySeedScale(value?: string | null): AgencySeedScale {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "massive") return "massive";
  return "default";
}

export function appendMassiveAgencyData(ctx: SeedContext, data: SeedDataBundle): SeedDataBundle {
  const { now, members } = ctx;
  const memberIds = members.map((member) => member.userId);
  const pickMember = () =>
    memberIds[Math.floor(Math.random() * memberIds.length)] ?? memberIds[0] ?? "";
  const daysAgo = (days: number) => shiftDate(now, { days: -days });

  while (data.clients.length < MASSIVE_SCALE_TARGETS.clients) {
    const index = data.clients.length + 1;
    data.clients.push({
      id: createWorkspaceId("agency-client"),
      name: `Scale Client ${index}`,
      contact: {
        name: `Contact ${index}`,
        email: `contact${index}@scale.test`,
        phone: "",
      },
      archived: index % 17 === 0,
    });
  }

  const activeClients = data.clients.filter((client) => !client.archived);
  while (data.projects.length < MASSIVE_SCALE_TARGETS.projects) {
    const index = data.projects.length + 1;
    const client = activeClients[index % activeClients.length] ?? activeClients[0];
    if (!client) break;
    data.projects.push({
      id: createWorkspaceId("agency-project"),
      clientId: client.id,
      name: `Scale Project ${index}`,
    });
  }

  let messageBudget = data.tasks.reduce((sum, task) => sum + task.messages.length, 0);

  while (data.tasks.length < MASSIVE_SCALE_TARGETS.tasks) {
    const index = data.tasks.length + 1;
    const project = data.projects[index % data.projects.length];
    if (!project) break;

    const assigneeId = pickMember();
    const status = TASK_STATUSES[index % TASK_STATUSES.length] ?? "open";
    const threadId = createWorkspaceId("agency-thread");
    const taskId = createWorkspaceId("agency-task");
    const messages: SeedMessageDef[] = [];
    const messageCount = Math.min(5, MASSIVE_SCALE_TARGETS.messages - messageBudget);

    for (let messageIndex = 0; messageIndex < messageCount; messageIndex += 1) {
      messages.push({
        id: createWorkspaceId("agency-message"),
        userId: pickMember(),
        content: `Scale message ${index}-${messageIndex + 1}`,
        type: "text",
        senderType: "user",
        createdAt: daysAgo((index % 28) + messageIndex),
      });
      messageBudget += 1;
      if (messageBudget >= MASSIVE_SCALE_TARGETS.messages) break;
    }

    data.tasks.push({
      id: taskId,
      threadId,
      projectId: project.id,
      title: `${TASK_TITLES[index % TASK_TITLES.length]} #${index}`,
      status,
      assigneeUserIds: assigneeId ? [assigneeId] : [],
      dueDate: shiftDate(now, { days: (index % 14) - 7 }),
      messages,
    });
  }

  while (data.timeEntries.length < MASSIVE_SCALE_TARGETS.timeEntries) {
    const index = data.timeEntries.length + 1;
    const project = data.projects[index % data.projects.length];
    if (!project) break;

    const projectTasks = data.tasks.filter((task) => task.projectId === project.id);
    const task = projectTasks[index % Math.max(projectTasks.length, 1)];
    const dayOffset = index % 30;
    const start = daysAgo(dayOffset);
    start.setUTCHours(9 + (index % 8), (index * 7) % 60, 0, 0);
    const durationMinutes = 15 + (index % 180);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    data.timeEntries.push({
      id: createWorkspaceId("agency-time-entry"),
      projectId: project.id,
      taskId: task?.id ?? null,
      userId: pickMember(),
      source: index % 3 === 0 ? "manual" : "timer",
      description: task ? `Work on ${task.title}` : `Scale work ${index}`,
      startedAt: start,
      endedAt: end,
      durationSeconds: durationMinutes * 60,
    });
  }

  return data;
}
