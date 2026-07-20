import { z } from "zod";

import { requireTeamMembership } from "../../../lib/team-membership";
import { getRedisPublisher, getRedisSubscriber } from "../../../lib/redis";
import {
  registerAgencyLiveUserConnection,
  unregisterAgencyLiveUserConnection,
} from "../../notifications/live-bridge";
import { notificationRecordSchema } from "../../../schemas/notifications";

const agencyActiveTimerLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  /** Empty when the timer was started before a project/task was chosen. */
  projectId: z.string(),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  projectName: z.string(),
  description: z.string(),
  isBillable: z.boolean(),
  tags: z.array(
    z.object({
      id: z.string().min(1),
      teamId: z.string().min(1),
      name: z.string().min(1),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  startedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectTaskAssigneeLiveSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  status: z.enum(["open", "in_progress", "done"]),
});

const agencyProjectTaskLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["open", "in_progress", "done", "archived"]),
  taskKind: z.enum(["standard", "journey_anchor", "journey_milestone"]),
  assignedToTeam: z.boolean(),
  isWaste: z.boolean(),
  createdByUserId: z.string().min(1),
  assignees: z.array(agencyProjectTaskAssigneeLiveSchema),
  viewerStatus: z.enum(["open", "in_progress", "done"]).optional(),
  viewerCompletionCount: z.number().int().nonnegative().optional(),
  dueDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyLiveEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("journey.step.updated"),
    teamId: z.string().min(1),
    projectId: z.string().min(1),
    updatedAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal("timer.updated"),
    teamId: z.string().min(1),
    userId: z.string().min(1),
    updatedAt: z.string().datetime(),
    timer: agencyActiveTimerLiveSchema.nullable(),
  }),
  z.object({
    type: z.literal("task.updated"),
    teamId: z.string().min(1),
    taskId: z.string().min(1),
    updatedAt: z.string().datetime(),
    task: agencyProjectTaskLiveSchema,
  }),
  z.object({
    type: z.literal("notification.created"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    notification: notificationRecordSchema,
  }),
]);

export type AgencyLiveEvent = z.infer<typeof agencyLiveEventSchema>;

const MAX_SUBSCRIBER_QUEUE = 50;

function liveEventCoalesceKey(event: AgencyLiveEvent): string | null {
  switch (event.type) {
    case "journey.step.updated":
      return `journey.step.updated:${event.projectId}`;
    case "timer.updated":
      return `timer.updated:${event.userId}`;
    case "task.updated":
      return `task.updated:${event.taskId}`;
    case "notification.created":
      return `notification.created:${event.notification.id}`;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

type Subscriber = {
  push: (event: AgencyLiveEvent) => void;
  signal?: AbortSignal;
};

function teamChannel(teamId: string) {
  return `team:${teamId}`;
}

function redisTeamChannel(teamId: string) {
  return `agency:live:team:${teamId}`;
}

class AgencyLivePublisher {
  private subscribers = new Map<string, Set<Subscriber>>();

  subscribe(teamId: string, signal?: AbortSignal): AsyncIterable<AgencyLiveEvent> {
    const channel = teamChannel(teamId);
    const publisher = this;

    return {
      async *[Symbol.asyncIterator]() {
        const queue: AgencyLiveEvent[] = [];
        let notify: (() => void) | null = null;

        const subscriber: Subscriber = {
          signal,
          push(event) {
            const key = liveEventCoalesceKey(event);
            if (key) {
              const idx = queue.findIndex((queued) => liveEventCoalesceKey(queued) === key);
              if (idx !== -1) {
                queue.splice(idx, 1);
              }
            }
            queue.push(event);
            // ponytail: cap at 50 events per slow subscriber; drop oldest on overflow.
            // Upgrade path: persistent replay buffer + client cursor/resume token.
            while (queue.length > MAX_SUBSCRIBER_QUEUE) {
              queue.shift();
            }
            notify?.();
            notify = null;
          },
        };

        let subscribers = publisher.subscribers.get(channel);
        if (!subscribers) {
          subscribers = new Set();
          publisher.subscribers.set(channel, subscribers);
        }
        subscribers.add(subscriber);

        const onAbort = () => {
          notify?.();
          notify = null;
        };

        signal?.addEventListener("abort", onAbort);

        try {
          while (!signal?.aborted) {
            if (queue.length === 0) {
              await new Promise<void>((resolve) => {
                if (signal?.aborted) {
                  resolve();
                  return;
                }
                notify = resolve;
              });
            }

            while (queue.length > 0) {
              yield queue.shift()!;
            }
          }
        } finally {
          signal?.removeEventListener("abort", onAbort);
          subscribers?.delete(subscriber);
          if (subscribers?.size === 0) {
            publisher.subscribers.delete(channel);
          }
        }
      },
    };
  }

  publish(teamId: string, event: AgencyLiveEvent) {
    const channel = teamChannel(teamId);
    const subscribers = this.subscribers.get(channel);
    if (!subscribers) {
      return;
    }

    for (const subscriber of [...subscribers]) {
      if (subscriber.signal?.aborted) {
        subscribers.delete(subscriber);
        continue;
      }
      subscriber.push(event);
    }

    if (subscribers.size === 0) {
      this.subscribers.delete(channel);
    }
  }
}

export const agencyLivePublisher = new AgencyLivePublisher();

export async function* subscribeAgencyLive(
  actorUserId: string,
  input: { teamId: string; signal?: AbortSignal },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  registerAgencyLiveUserConnection(actorUserId, input.teamId);
  try {
    for await (const event of agencyLivePublisher.subscribe(input.teamId, input.signal)) {
      yield agencyLiveEventSchema.parse(event);
    }
  } finally {
    unregisterAgencyLiveUserConnection(actorUserId, input.teamId);
  }
}

export function liveUpdatedAt(value: string | Date) {
  return typeof value === "string" ? value : value.toISOString();
}

export async function publishAgencyLiveEvent(teamId: string, event: AgencyLiveEvent) {
  agencyLiveEventSchema.parse(event);
  await getRedisPublisher().publish(redisTeamChannel(teamId), JSON.stringify(event));
}

export async function publishAgencyJourneyStepUpdated(teamId: string, projectId: string) {
  await publishAgencyLiveEvent(teamId, {
    type: "journey.step.updated",
    teamId,
    projectId,
    updatedAt: liveUpdatedAt(new Date()),
  });
}

export async function publishAgencyTimerUpdated(
  teamId: string,
  userId: string,
  timer: {
    id: string;
    teamId: string;
    userId: string;
    projectId: string;
    taskId: string | null;
    taskTitle: string | null;
    projectName: string;
    description: string;
    isBillable: boolean;
    tags: Array<{
      id: string;
      teamId: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    }>;
    startedAt: string;
    createdAt: string;
    updatedAt: string;
  } | null,
) {
  await publishAgencyLiveEvent(teamId, {
    type: "timer.updated",
    teamId,
    userId,
    timer,
    updatedAt: liveUpdatedAt(new Date()),
  });
}

export async function publishAgencyTaskUpdated(
  teamId: string,
  task: {
    id: string;
    teamId: string;
    projectId: string;
    title: string;
    status: "open" | "in_progress" | "done" | "archived";
    taskKind: "standard" | "journey_anchor" | "journey_milestone";
    assignedToTeam: boolean;
    isWaste: boolean;
    createdByUserId: string;
    assignees: Array<{
      userId: string;
      userName: string;
      userAvatar: string | null;
      status: "open" | "in_progress" | "done";
    }>;
    viewerStatus?: "open" | "in_progress" | "done";
    viewerCompletionCount?: number;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  },
) {
  await publishAgencyLiveEvent(teamId, {
    type: "task.updated",
    teamId,
    taskId: task.id,
    task,
    updatedAt: liveUpdatedAt(new Date()),
  });
}

let redisSubscriberBootstrapped = false;

export async function bootstrapAgencyLiveRedisSubscriber() {
  if (redisSubscriberBootstrapped) {
    return;
  }
  redisSubscriberBootstrapped = true;

  const subscriber = getRedisSubscriber();
  await subscriber.psubscribe("agency:live:team:*");

  subscriber.on("pmessage", (_pattern, channel, message) => {
    try {
      const event = agencyLiveEventSchema.parse(JSON.parse(message));
      const teamId = channel.replace("agency:live:team:", "");
      agencyLivePublisher.publish(teamId, event);
    } catch (error) {
      console.error("Invalid agency live event from Redis:", error);
    }
  });
}
