import type { InfiniteData } from "@tanstack/react-query";

export type LiveCacheTaskMessage = {
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
  attachments: Array<{
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
  }>;
};

export type LiveCacheTaskMessagesListPage = {
  items: LiveCacheTaskMessage[];
  page: number;
  pageSize: number;
  total: number;
};

export type AgencyTaskMessagesInfiniteQueryData = InfiniteData<LiveCacheTaskMessagesListPage>;

function updateNewestPageItems(
  data: AgencyTaskMessagesInfiniteQueryData | undefined,
  updateItems: (items: LiveCacheTaskMessage[]) => LiveCacheTaskMessage[],
  getTotalDelta?: (before: LiveCacheTaskMessage[], after: LiveCacheTaskMessage[]) => number,
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

function prependMessagesDesc(
  items: LiveCacheTaskMessage[],
  incoming: LiveCacheTaskMessage[],
): LiveCacheTaskMessage[] {
  const incomingIds = new Set(incoming.map((message) => message.id));
  const filtered = items.filter((item) => !incomingIds.has(item.id));
  return [...incoming, ...filtered];
}

export function insertLiveTaskMessageIntoInfiniteCache(
  data: AgencyTaskMessagesInfiniteQueryData | undefined,
  message: LiveCacheTaskMessage,
  pageSize = 50,
): AgencyTaskMessagesInfiniteQueryData | undefined {
  return updateNewestPageItems(
    data,
    (items) => {
      if (items.some((item) => item.id === message.id)) {
        return items.map((item) => (item.id === message.id ? message : item));
      }
      return prependMessagesDesc(items, [message]);
    },
    (before, after) => {
      if (before.some((item) => item.id === message.id)) {
        return 0;
      }
      return after.length > before.length ? 1 : 0;
    },
    pageSize,
  );
}
