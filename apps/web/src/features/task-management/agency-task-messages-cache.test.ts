import { describe, expect, it } from "bun:test";

import {
  insertLiveTaskMessageIntoInfiniteCache,
  type AgencyTaskMessagesInfiniteQueryData,
  type LiveCacheTaskMessage,
} from "@/features/task-management/agency-task-messages-cache";

describe("insertLiveTaskMessageIntoInfiniteCache", () => {
  it("inserts live messages into the newest infinite-query page without duplicates", () => {
    const existing: LiveCacheTaskMessage = {
      id: "msg-1",
      teamId: "team-1",
      threadId: "thread-1",
      userId: "user-1",
      userName: "Ada",
      userAvatar: null,
      content: "hello",
      type: "text",
      senderType: "user",
      createdAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
      attachments: [],
    };
    const incoming: LiveCacheTaskMessage = {
      ...existing,
      id: "msg-2",
      content: "live",
      createdAt: "2026-07-05T10:01:00.000Z",
      updatedAt: "2026-07-05T10:01:00.000Z",
    };

    const initial: AgencyTaskMessagesInfiniteQueryData = {
      pages: [{ items: [existing], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    };

    const patched = insertLiveTaskMessageIntoInfiniteCache(initial, incoming);
    expect(patched?.pages[0]?.items.map((item) => item.id)).toEqual(["msg-2", "msg-1"]);
    expect(patched?.pages[0]?.total).toBe(2);

    const deduped = insertLiveTaskMessageIntoInfiniteCache(patched, {
      ...incoming,
      content: "live updated",
    });
    expect(deduped?.pages[0]?.items).toHaveLength(2);
    expect(deduped?.pages[0]?.items[0]?.content).toBe("live updated");
    expect(deduped?.pages[0]?.total).toBe(2);
  });
});
