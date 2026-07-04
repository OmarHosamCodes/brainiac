import { create } from "zustand";

export type AgencyNotificationItem = {
  id: string;
  teamId: string;
  type: "task_assigned" | "thread_message";
  actorUserId: string | null;
  taskId: string;
  messageId: string | null;
  title: string;
  body: string;
  description: string;
  readAt: string | null;
  createdAt: string;
};

type AgencyNotificationsState = {
  itemsByTeam: Record<string, AgencyNotificationItem[]>;
  unreadCountByTeam: Record<string, number>;
  mergeItems: (teamId: string, items: AgencyNotificationItem[], unreadCount: number) => void;
  setUnreadCount: (teamId: string, unreadCount: number) => void;
  markItemsRead: (teamId: string, ids: string[]) => void;
  markAllRead: (teamId: string) => void;
  resetTeam: (teamId: string) => void;
};

function mergeNotificationItems(
  current: AgencyNotificationItem[],
  incoming: AgencyNotificationItem[],
): AgencyNotificationItem[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }
  return [...byId.values()].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export const useAgencyNotificationsStore = create<AgencyNotificationsState>((set) => ({
  itemsByTeam: {},
  unreadCountByTeam: {},
  mergeItems: (teamId, items, unreadCount) =>
    set((state) => ({
      itemsByTeam: {
        ...state.itemsByTeam,
        [teamId]: mergeNotificationItems(state.itemsByTeam[teamId] ?? [], items),
      },
      unreadCountByTeam: {
        ...state.unreadCountByTeam,
        [teamId]: unreadCount,
      },
    })),
  setUnreadCount: (teamId, unreadCount) =>
    set((state) => ({
      unreadCountByTeam: {
        ...state.unreadCountByTeam,
        [teamId]: unreadCount,
      },
    })),
  markItemsRead: (teamId, ids) =>
    set((state) => {
      const idSet = new Set(ids);
      const items = state.itemsByTeam[teamId] ?? [];
      const nextItems = items.map((item) =>
        idSet.has(item.id) ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
      );
      const unreadDelta = nextItems.filter(
        (item, index) => idSet.has(item.id) && !items[index]?.readAt,
      ).length;
      return {
        itemsByTeam: {
          ...state.itemsByTeam,
          [teamId]: nextItems,
        },
        unreadCountByTeam: {
          ...state.unreadCountByTeam,
          [teamId]: Math.max(0, (state.unreadCountByTeam[teamId] ?? 0) - unreadDelta),
        },
      };
    }),
  markAllRead: (teamId) =>
    set((state) => ({
      itemsByTeam: {
        ...state.itemsByTeam,
        [teamId]: (state.itemsByTeam[teamId] ?? []).map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      },
      unreadCountByTeam: {
        ...state.unreadCountByTeam,
        [teamId]: 0,
      },
    })),
  resetTeam: (teamId) =>
    set((state) => {
      const nextItems = { ...state.itemsByTeam };
      const nextUnread = { ...state.unreadCountByTeam };
      delete nextItems[teamId];
      delete nextUnread[teamId];
      return { itemsByTeam: nextItems, unreadCountByTeam: nextUnread };
    }),
}));
