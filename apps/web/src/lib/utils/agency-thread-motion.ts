import type { AgencyListOverlay } from "@/lib/utils/agency-optimistic-merge";

export const AGENCY_THREAD_MESSAGE_EASE = [0.25, 1, 0.5, 1] as const;
export const AGENCY_THREAD_MESSAGE_DURATION = 0.2;

export function resolveMessageAnimationKey(
  messageId: string,
  idMap: Record<string, string>,
): string {
  if (idMap[messageId]) {
    return messageId;
  }

  for (const [optimisticId, realId] of Object.entries(idMap)) {
    if (realId === messageId) {
      return optimisticId;
    }
  }

  return messageId;
}

export function isOptimisticTaskMessage(
  messageId: string,
  overlay: AgencyListOverlay<{ id: string }>,
): boolean {
  if (!(messageId in overlay.upserts)) {
    return false;
  }

  const reconciledRealIds = new Set(Object.values(overlay.idMap));
  return !reconciledRealIds.has(messageId);
}

const AGENT_PENDING_ID_PREFIX = "agency-task-agent-pending-";

export function buildAgentPendingMessage(
  teamId: string,
  taskId: string,
  id = `${AGENT_PENDING_ID_PREFIX}${crypto.randomUUID()}`,
) {
  const nowIso = new Date().toISOString();
  return {
    id,
    teamId,
    threadId: taskId,
    userId: "",
    userName: "Agent",
    userAvatar: null,
    content: "",
    type: "text" as const,
    senderType: "agent" as const,
    createdAt: nowIso,
    updatedAt: nowIso,
    attachments: [] as Array<{
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
    }>,
  };
}

export function isAgentPendingMessageId(messageId: string) {
  return messageId.startsWith(AGENT_PENDING_ID_PREFIX);
}
