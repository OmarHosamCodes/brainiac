import type { InfiniteData } from "@tanstack/react-query";
import { create } from "zustand";

import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";
import { agencyTaskMessagesInfiniteQueryKey } from "@/features/task-management/agency-task-messages-query";
import { getRpcBaseUrl } from "@/lib/env";
import { getQueryClient } from "@/lib/query-client";
import { orpcClient } from "@/lib/orpc";

type ListPage = {
  items: AgencyTaskMessage[];
  nextCursor: string | null;
  canPost: boolean;
};

type AgencyTaskMessagesStore = {
  sendMessage: (input: {
    teamId: string;
    taskId: string;
    content: string;
    files: File[];
    actor: { userId: string; userName: string; userAvatar: string | null };
  }) => Promise<void>;
  applyLiveMessage: (message: AgencyTaskMessage) => void;
};

async function uploadAttachment(teamId: string, taskId: string, file: File) {
  const form = new FormData();
  form.set("teamId", teamId);
  form.set("taskId", taskId);
  form.set("file", file);
  const response = await fetch(`${getRpcBaseUrl()}/uploads/task-attachments`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Attachment upload failed.");
  }
  return (await response.json()) as {
    uploadToken: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    publicUrl: string | null;
  };
}

function patchNewestPage(
  data: InfiniteData<ListPage> | undefined,
  patch: (items: AgencyTaskMessage[], page: ListPage) => ListPage,
): InfiniteData<ListPage> | undefined {
  if (!data?.pages.length) return data;
  const pages = data.pages.map((page, index) => (index === 0 ? patch(page.items, page) : page));
  return { ...data, pages };
}

export const useAgencyTaskMessagesStore = create<AgencyTaskMessagesStore>(() => ({
  applyLiveMessage(message) {
    const queryClient = getQueryClient();
    const queryKey = agencyTaskMessagesInfiniteQueryKey(message.teamId, message.taskId);
    queryClient.setQueryData<InfiniteData<ListPage>>(queryKey, (current) =>
      patchNewestPage(current, (items, page) => {
        if (items.some((item) => item.id === message.id)) return page;
        const withoutPending = items.filter(
          (item) =>
            !(item.pending && item.userId === message.userId && item.content === message.content),
        );
        return { ...page, items: [...withoutPending, message] };
      }),
    );
  },

  async sendMessage({ teamId, taskId, content, files, actor }) {
    const queryClient = getQueryClient();
    const queryKey = agencyTaskMessagesInfiniteQueryKey(teamId, taskId);
    const pendingId = `pending-${crypto.randomUUID()}`;
    const trimmed = content.trim();

    const optimisticAttachments = files.map((file, index) => ({
      id: `${pendingId}-att-${index}`,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      url: null as string | null,
    }));

    const optimistic: AgencyTaskMessage = {
      id: pendingId,
      teamId,
      taskId,
      userId: actor.userId,
      userName: actor.userName,
      userAvatar: actor.userAvatar,
      content: trimmed,
      createdAt: new Date().toISOString(),
      attachments: optimisticAttachments,
      pending: true,
    };

    queryClient.setQueryData<InfiniteData<ListPage>>(queryKey, (current) => {
      if (!current?.pages.length) {
        return {
          pages: [{ items: [optimistic], nextCursor: null, canPost: true }],
          pageParams: [undefined],
        };
      }
      return patchNewestPage(current, (items, page) => ({
        ...page,
        items: [...items, optimistic],
      }))!;
    });

    try {
      const tokens: string[] = [];
      for (const file of files) {
        const uploaded = await uploadAttachment(teamId, taskId, file);
        tokens.push(uploaded.uploadToken);
      }

      const saved = await orpcClient.agencyOps.taskMessages.send({
        teamId,
        taskId,
        content: trimmed,
        attachmentUploadTokens: tokens,
      });

      queryClient.setQueryData<InfiniteData<ListPage>>(queryKey, (current) =>
        patchNewestPage(current, (items, page) => ({
          ...page,
          items: items.map((item) => (item.id === pendingId ? saved : item)),
        })),
      );
    } catch (error) {
      queryClient.setQueryData<InfiniteData<ListPage>>(queryKey, (current) =>
        patchNewestPage(current, (items, page) => ({
          ...page,
          items: items.filter((item) => item.id !== pendingId),
        })),
      );
      throw error;
    }
  },
}));
