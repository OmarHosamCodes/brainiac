import { z } from "zod";

import { getRedisPublisher, getRedisSubscriber } from "../../lib/redis";

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

export const agencyLiveEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("taskMessage.created"),
    teamId: z.string().min(1),
    taskId: z.string().min(1),
    updatedAt: z.string().datetime(),
    message: agencyTaskMessageLiveSchema,
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

export function liveUpdatedAt(value: string | Date) {
  return typeof value === "string" ? value : value.toISOString();
}

export async function publishAgencyLiveEvent(teamId: string, event: AgencyLiveEvent) {
  agencyLiveEventSchema.parse(event);
  await getRedisPublisher().publish(redisTeamChannel(teamId), JSON.stringify(event));
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
