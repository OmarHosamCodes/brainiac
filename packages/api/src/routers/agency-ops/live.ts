import { z } from "zod";

const agencyTagLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyClientLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectTaskLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["open", "in_progress", "done", "archived"]),
  assigneeUserId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  assigneeAvatar: z.string().nullable(),
  dueDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyTaskMessageAttachmentLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  messageId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  metadata: z.unknown().nullable().optional(),
  createdAt: z.string().datetime(),
  url: z.string().nullable(),
});

const agencyTaskMessageLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  threadId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  content: z.string(),
  type: z.enum(["text", "voice", "attachment"]),
  senderType: z.enum(["user", "agent"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  attachments: z.array(agencyTaskMessageAttachmentLiveSchema),
});

const agencyContactLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyActiveTimerLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  projectName: z.string().min(1),
  tags: z.array(agencyTagLiveSchema),
  description: z.string(),
  linkUrl: z.string().nullable(),
  startedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyTimeEntryLiveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  projectName: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  tags: z.array(agencyTagLiveSchema),
  source: z.enum(["timer", "manual"]),
  description: z.string(),
  linkUrl: z.string().nullable(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyCapacitySetLiveSchema = z.object({
  userId: z.string().min(1),
  weekStart: z.string().datetime(),
  capacitySeconds: z.number().int().nonnegative(),
});

export const agencyLiveEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("client.created"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    client: agencyClientLiveSchema,
  }),
  z.object({
    type: z.literal("client.updated"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    client: agencyClientLiveSchema,
  }),
  z.object({
    type: z.literal("client.archived"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    clientId: z.string().min(1),
  }),
  z.object({
    type: z.literal("client.unarchived"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    client: agencyClientLiveSchema,
  }),
  z.object({
    type: z.literal("project.created"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    project: agencyProjectLiveSchema,
  }),
  z.object({
    type: z.literal("project.updated"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    project: agencyProjectLiveSchema,
  }),
  z.object({
    type: z.literal("projectTask.created"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    task: agencyProjectTaskLiveSchema,
  }),
  z.object({
    type: z.literal("projectTask.updated"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    task: agencyProjectTaskLiveSchema,
  }),
  z.object({
    type: z.literal("projectTask.deleted"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    taskId: z.string().min(1),
    projectId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("taskMessage.created"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    taskId: z.string().min(1),
    message: agencyTaskMessageLiveSchema,
  }),
  z.object({
    type: z.literal("contact.upserted"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    clientId: z.string().min(1),
    contact: agencyContactLiveSchema,
  }),
  z.object({
    type: z.literal("timer.started"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    userId: z.string().min(1),
    timer: agencyActiveTimerLiveSchema.nullable(),
    createdEntry: agencyTimeEntryLiveSchema.nullable().optional(),
  }),
  z.object({
    type: z.literal("timer.stopped"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    userId: z.string().min(1),
    timer: agencyActiveTimerLiveSchema.nullable(),
    createdEntry: agencyTimeEntryLiveSchema.nullable().optional(),
  }),
  z.object({
    type: z.literal("timeEntry.created"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    entry: agencyTimeEntryLiveSchema,
  }),
  z.object({
    type: z.literal("timeEntry.updated"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    entry: agencyTimeEntryLiveSchema,
  }),
  z.object({
    type: z.literal("timeEntry.deleted"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    entryId: z.string().min(1),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal("capacity.set"),
    teamId: z.string().min(1),
    updatedAt: z.string().datetime(),
    capacity: agencyCapacitySetLiveSchema,
  }),
]);

export type AgencyLiveEvent = z.infer<typeof agencyLiveEventSchema>;

type Subscriber = {
  push: (event: AgencyLiveEvent) => void;
  signal?: AbortSignal;
};

function teamChannel(teamId: string) {
  return `team:${teamId}`;
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
            queue.push(event);
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
    const subscribers = this.subscribers.get(teamChannel(teamId));
    if (!subscribers) {
      return;
    }

    for (const subscriber of subscribers) {
      if (subscriber.signal?.aborted) {
        continue;
      }
      subscriber.push(event);
    }
  }
}

export const agencyLivePublisher = new AgencyLivePublisher();

export function publishAgencyLiveEvent(teamId: string, event: AgencyLiveEvent) {
  agencyLiveEventSchema.parse(event);
  agencyLivePublisher.publish(teamId, event);
}

export function liveUpdatedAt(value: string | Date) {
  return typeof value === "string" ? value : value.toISOString();
}
