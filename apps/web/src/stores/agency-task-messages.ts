/**
 * Task thread message mutations — optimistic overlay + infinite query cache patches.
 */
import type { InfiniteData } from "@tanstack/react-query";
import { create } from "zustand";

import { getQueryClient } from "@/lib/query-client";
import { orpcClient } from "@/lib/orpc";
import {
  buildAgentPendingMessage,
  isAgentPendingMessageId,
} from "@/lib/utils/agency-thread-motion";
import { createEmptyListOverlay } from "@/lib/utils/agency-optimistic-merge";
import { insertLiveTaskMessageIntoInfiniteCache } from "@/lib/utils/agency-task-messages-cache";
import { useAgencyOptimisticStore } from "@/stores/agency-optimistic";

export type AgencyTaskMessageAttachment = {
  id: string;
  teamId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  durationSeconds: number | null;
  metadata?: unknown;
  createdAt: string;
  url: string | null;
};

export type AgencyTaskMessage = {
  id: string;
  teamId: string;
  threadId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: string;
  updatedAt: string;
  attachments: AgencyTaskMessageAttachment[];
};

export type AgencyTaskMessagesListPage = {
  items: AgencyTaskMessage[];
  page: number;
  pageSize: number;
  total: number;
};

export type AgencyTaskMessagesInfiniteQueryData = InfiniteData<AgencyTaskMessagesListPage>;

export type SendTaskMessagePayload = {
  teamId: string;
  taskId: string;
  content: string;
  type?: "text" | "voice" | "attachment";
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    durationSeconds?: number | null;
    uploadToken: string;
    metadata?: Record<string, unknown>;
    url?: string | null;
  }>;
};

export type AskTaskAgentPayload = SendTaskMessagePayload & {
  model?: string;
};

type QueryKey = readonly unknown[];

type QuerySnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

type RegisteredTaskMessagesQuery = {
  queryKey: QueryKey;
  teamId: string;
  taskId: string;
};

type RefCounted<T> = { payload: T; count: number };

type AgencyTaskMessagesState = {
  isSending: boolean;
  agentPending: boolean;
  lastError: string | null;
  registerTaskMessagesQuery: (payload: RegisteredTaskMessagesQuery) => void;
  unregisterTaskMessagesQuery: (queryKey: QueryKey) => void;
  applyLiveMessage: (teamId: string, taskId: string, message: AgencyTaskMessage) => void;
  invalidateTaskMessages: (teamId: string, taskId: string) => Promise<void>;
  sendMessage: (payload: SendTaskMessagePayload) => Promise<AgencyTaskMessage | undefined>;
  askAgent: (payload: AskTaskAgentPayload) => Promise<
    | {
        userMessage: AgencyTaskMessage;
        agentMessage: AgencyTaskMessage;
        model: string;
        response: string;
      }
    | undefined
  >;
  clearError: () => void;
};

const taskMessagesQueryRegistry = new Map<string, RefCounted<RegisteredTaskMessagesQuery>>();

function registryKey(queryKey: QueryKey) {
  return JSON.stringify(queryKey);
}

function optimistic() {
  return useAgencyOptimisticStore.getState();
}

function optimisticId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function registryPayloads(): RegisteredTaskMessagesQuery[] {
  return [...taskMessagesQueryRegistry.values()].map(({ payload }) => payload);
}

function snapshotQueries(): QuerySnapshot[] {
  const client = getQueryClient();
  return registryPayloads().map(({ queryKey }) => ({
    queryKey,
    data: client.getQueryData(queryKey),
  }));
}

function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
  const client = getQueryClient();
  for (const snapshot of snapshots) {
    client.setQueryData(snapshot.queryKey, snapshot.data);
  }
}

function registerInto(key: string, payload: RegisteredTaskMessagesQuery) {
  const existing = taskMessagesQueryRegistry.get(key);
  if (existing) {
    existing.count += 1;
    existing.payload = payload;
  } else {
    taskMessagesQueryRegistry.set(key, { payload, count: 1 });
  }
}

function unregisterFrom(key: string) {
  const existing = taskMessagesQueryRegistry.get(key);
  if (!existing) return;
  if (existing.count <= 1) {
    taskMessagesQueryRegistry.delete(key);
  } else {
    existing.count -= 1;
  }
}

function updateNewestPageItems(
  data: AgencyTaskMessagesInfiniteQueryData | undefined,
  updateItems: (items: AgencyTaskMessage[]) => AgencyTaskMessage[],
  getTotalDelta?: (before: AgencyTaskMessage[], after: AgencyTaskMessage[]) => number,
  pageSize = 50,
): AgencyTaskMessagesInfiniteQueryData | undefined {
  if (!data?.pages.length) {
    const items = updateItems([]);
    if (items.length === 0) return data;
    return {
      pages: [{ items, page: 1, pageSize, total: items.length }],
      pageParams: [1],
    };
  }
  const pages = [...data.pages];
  const firstPage = pages[0];
  if (!firstPage) return data;
  const before = firstPage.items;
  const after = updateItems(before);
  const totalDelta = getTotalDelta?.(before, after) ?? 0;
  pages[0] = {
    ...firstPage,
    items: after,
    total: Math.max(0, firstPage.total + totalDelta),
  };
  return { ...data, pages };
}

async function cancelTaskMessageQueries(teamId: string, taskId: string) {
  const client = getQueryClient();
  await Promise.all(
    registryPayloads()
      .filter((reg) => reg.teamId === teamId && reg.taskId === taskId)
      .map((reg) => client.cancelQueries({ queryKey: reg.queryKey })),
  );
}

function patchMessagesForThread(
  teamId: string,
  taskId: string,
  mutator: (
    data: AgencyTaskMessagesInfiniteQueryData | undefined,
  ) => AgencyTaskMessagesInfiniteQueryData | undefined,
) {
  const client = getQueryClient();
  taskMessagesQueryRegistry.forEach(({ payload: reg }) => {
    if (reg.teamId !== teamId || reg.taskId !== taskId) return;
    client.setQueryData<AgencyTaskMessagesInfiniteQueryData | undefined>(reg.queryKey, mutator);
  });
}

async function patchMessagesForThreadSafe(
  teamId: string,
  taskId: string,
  mutator: (
    data: AgencyTaskMessagesInfiniteQueryData | undefined,
  ) => AgencyTaskMessagesInfiniteQueryData | undefined,
) {
  await cancelTaskMessageQueries(teamId, taskId);
  patchMessagesForThread(teamId, taskId, mutator);
}

function prependMessagesDesc(
  items: AgencyTaskMessage[],
  incoming: AgencyTaskMessage[],
): AgencyTaskMessage[] {
  const incomingIds = new Set(incoming.map((message) => message.id));
  const filtered = items.filter((item) => !incomingIds.has(item.id));
  return [...incoming, ...filtered];
}

function reconcileOverlayForLiveMessage(
  teamId: string,
  taskId: string,
  message: AgencyTaskMessage,
) {
  const overlayKey = `${teamId}:${taskId}`;
  const overlay = optimistic().taskMessages[overlayKey];
  if (!overlay) {
    return;
  }

  for (const [optimisticId, realId] of Object.entries(overlay.idMap)) {
    if (realId === message.id) {
      optimistic().deleteTaskMessage(teamId, taskId, optimisticId);
    }
  }

  for (const [optimisticId, upsert] of Object.entries(overlay.upserts)) {
    if (!optimisticId.startsWith("agency-task-message-")) {
      continue;
    }
    if (upsert.userId && message.userId && upsert.userId !== message.userId) {
      continue;
    }
    if (upsert.content.trim() !== message.content.trim()) {
      continue;
    }
    optimistic().reconcileTaskMessage(teamId, taskId, optimisticId, message);
  }
}

function patchInsertedTaskMessage(teamId: string, taskId: string, message: AgencyTaskMessage) {
  // ponytail: pending rows live in the overlay only; cache stays server-shaped so a
  // hot poll cannot wipe an optimistic id and flash the row away mid-reconcile.
  optimistic().upsertTaskMessage(teamId, taskId, message);
}

function patchRemovedTaskMessage(teamId: string, taskId: string, messageId: string) {
  optimistic().deleteTaskMessage(teamId, taskId, messageId);
}

function invalidateTaskMessageQueries(teamId: string, taskId: string) {
  return Promise.all(
    registryPayloads()
      .filter((reg) => reg.teamId === teamId && reg.taskId === taskId)
      .map((reg) => getQueryClient().invalidateQueries({ queryKey: reg.queryKey })),
  );
}

async function applyServerMessagesToCache(
  teamId: string,
  taskId: string,
  options: {
    removeIds: string[];
    insertMessagesDesc: AgencyTaskMessage[];
  },
) {
  const removeSet = new Set(options.removeIds);
  const insertMessages = options.insertMessagesDesc.filter((message) => message?.id);

  await patchMessagesForThreadSafe(teamId, taskId, (current) =>
    updateNewestPageItems(
      current,
      (items) => {
        const withoutRemoved = items.filter((item) => !removeSet.has(item.id));
        const insertIds = new Set(insertMessages.map((message) => message.id));
        const withoutDuplicates = withoutRemoved.filter((item) => !insertIds.has(item.id));
        return prependMessagesDesc(withoutDuplicates, insertMessages);
      },
      (before, after) => {
        const removed = before.filter((item) => removeSet.has(item.id)).length;
        const inserted = insertMessages.filter(
          (message) => !before.some((item) => item.id === message.id),
        ).length;
        return inserted - removed;
      },
    ),
  );
}

async function patchReconciledMessages(
  teamId: string,
  taskId: string,
  replacements: Array<{ optimisticId: string; serverMessage: AgencyTaskMessage }>,
) {
  const valid = replacements.filter(
    (replacement) => replacement.serverMessage?.id && replacement.optimisticId,
  );
  if (valid.length === 0) return;

  for (const { optimisticId: oldId, serverMessage } of valid) {
    optimistic().reconcileTaskMessage(teamId, taskId, oldId, serverMessage);
  }

  await applyServerMessagesToCache(teamId, taskId, {
    removeIds: valid.map((replacement) => replacement.optimisticId),
    insertMessagesDesc: valid.map((replacement) => replacement.serverMessage),
  });
}

function buildOptimisticAttachments(
  payload: SendTaskMessagePayload,
  messageId: string,
): AgencyTaskMessageAttachment[] {
  const nowIso = new Date().toISOString();
  return (payload.attachments ?? []).map((attachment, index) => ({
    id: optimisticId(`agency-task-attachment-${index}`),
    teamId: payload.teamId,
    messageId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    storageKey: attachment.storageKey,
    sizeBytes: attachment.sizeBytes,
    durationSeconds: attachment.durationSeconds ?? null,
    metadata: attachment.metadata,
    createdAt: nowIso,
    url: attachment.url ?? null,
  }));
}

function buildOptimisticTaskMessage(
  payload: SendTaskMessagePayload,
  messageId: string,
): AgencyTaskMessage {
  const nowIso = new Date().toISOString();
  return {
    id: messageId,
    teamId: payload.teamId,
    threadId: payload.taskId,
    userId: "",
    userName: "You",
    userAvatar: null,
    content: payload.content,
    type: payload.type ?? "text",
    senderType: "user",
    createdAt: nowIso,
    updatedAt: nowIso,
    attachments: buildOptimisticAttachments(payload, messageId),
  };
}

export { isAgentPendingMessageId } from "@/lib/utils/agency-thread-motion";

export const useAgencyTaskMessagesStore = create<AgencyTaskMessagesState>((set) => ({
  isSending: false,
  agentPending: false,
  lastError: null,

  clearError: () => set({ lastError: null }),

  registerTaskMessagesQuery: (payload) => {
    registerInto(registryKey(payload.queryKey), payload);
  },

  unregisterTaskMessagesQuery: (queryKey) => {
    unregisterFrom(registryKey(queryKey));
  },

  applyLiveMessage: (teamId, taskId, message) => {
    if (!teamId || !taskId || !message?.id) {
      return;
    }
    reconcileOverlayForLiveMessage(teamId, taskId, message);
    patchMessagesForThread(teamId, taskId, (current) =>
      insertLiveTaskMessageIntoInfiniteCache(current, message),
    );
  },

  invalidateTaskMessages: (teamId, taskId) => invalidateTaskMessageQueries(teamId, taskId),

  sendMessage: async (payload) => {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries();
    const optimisticSnapshot = optimistic().snapshotTaskMessages(payload.teamId, payload.taskId);
    const optimisticMessage = buildOptimisticTaskMessage(
      payload,
      optimisticId("agency-task-message"),
    );

    set({ isSending: true, lastError: null });

    try {
      patchInsertedTaskMessage(payload.teamId, payload.taskId, optimisticMessage);

      const created = (await orpcClient.agencyOps.taskThreads.messages.create({
        teamId: payload.teamId,
        taskId: payload.taskId,
        content: payload.content,
        type: payload.type,
        attachments: payload.attachments as Parameters<
          typeof orpcClient.agencyOps.taskThreads.messages.create
        >[0]["attachments"],
      })) as AgencyTaskMessage;

      if (!created?.id) {
        throw new Error("Server did not return the created message.");
      }

      await patchReconciledMessages(payload.teamId, payload.taskId, [
        { optimisticId: optimisticMessage.id, serverMessage: created },
      ]);

      return created;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTaskMessages(payload.teamId, payload.taskId, optimisticSnapshot);
      set({
        lastError: error instanceof Error ? error.message : "Couldn't send message.",
      });
      throw error;
    } finally {
      set({ isSending: false });
    }
  },

  askAgent: async (payload) => {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries();
    const optimisticSnapshot = optimistic().snapshotTaskMessages(payload.teamId, payload.taskId);
    const optimisticUserMessage = buildOptimisticTaskMessage(
      payload,
      optimisticId("agency-task-message"),
    );
    const agentPlaceholder = buildAgentPendingMessage(payload.teamId, payload.taskId);

    set({ agentPending: true, lastError: null });

    patchInsertedTaskMessage(payload.teamId, payload.taskId, optimisticUserMessage);
    patchInsertedTaskMessage(payload.teamId, payload.taskId, agentPlaceholder);

    let result: {
      userMessage?: AgencyTaskMessage;
      agentMessage?: AgencyTaskMessage;
      model: string;
      response: string;
    };

    try {
      result = await orpcClient.agencyOps.taskAgent.ask({
        teamId: payload.teamId,
        taskId: payload.taskId,
        content: payload.content,
        model: payload.model,
        attachments: payload.attachments as Parameters<
          typeof orpcClient.agencyOps.taskAgent.ask
        >[0]["attachments"],
      });
    } catch (apiError) {
      patchRemovedTaskMessage(payload.teamId, payload.taskId, agentPlaceholder.id);
      patchRemovedTaskMessage(payload.teamId, payload.taskId, optimisticUserMessage.id);
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTaskMessages(payload.teamId, payload.taskId, optimisticSnapshot);
      set({
        lastError: apiError instanceof Error ? apiError.message : "Agent error.",
        agentPending: false,
      });
      throw apiError;
    }

    try {
      patchRemovedTaskMessage(payload.teamId, payload.taskId, agentPlaceholder.id);

      if (result.userMessage?.id && result.agentMessage?.id) {
        optimistic().reconcileTaskMessage(
          payload.teamId,
          payload.taskId,
          optimisticUserMessage.id,
          result.userMessage,
        );
        optimistic().upsertTaskMessage(payload.teamId, payload.taskId, result.agentMessage);
        await applyServerMessagesToCache(payload.teamId, payload.taskId, {
          removeIds: [optimisticUserMessage.id],
          insertMessagesDesc: [result.agentMessage, result.userMessage],
        });
      } else {
        patchRemovedTaskMessage(payload.teamId, payload.taskId, optimisticUserMessage.id);
        optimistic().restoreTaskMessages(payload.teamId, payload.taskId, createEmptyListOverlay());
        await invalidateTaskMessageQueries(payload.teamId, payload.taskId);
      }

      return result as {
        userMessage: AgencyTaskMessage;
        agentMessage: AgencyTaskMessage;
        model: string;
        response: string;
      };
    } catch (processingError) {
      patchRemovedTaskMessage(payload.teamId, payload.taskId, optimisticUserMessage.id);
      optimistic().restoreTaskMessages(payload.teamId, payload.taskId, createEmptyListOverlay());
      await invalidateTaskMessageQueries(payload.teamId, payload.taskId);
      set({
        lastError: processingError instanceof Error ? processingError.message : "Agent error.",
      });
      throw processingError;
    } finally {
      set({ agentPending: false });
    }
  },
}));
