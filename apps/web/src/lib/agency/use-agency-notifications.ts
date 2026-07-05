import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { openAgencyTask } from "@/lib/agency/agency-notification-navigation";
import type { AgencySegmentId } from "@/lib/agency-segments";
import {
  readAgencyNotificationSince,
  useAgencyNotificationsInboxQuery,
  useAgencyNotificationsPollQuery,
  writeAgencyNotificationSince,
} from "@/lib/queries/agency-notifications";
import { orpc, orpcClient } from "@/lib/orpc";
import { showAgencyNotificationToast } from "@/components/agency/agency-notification-toast";
import {
  useAgencyNotificationsStore,
  type AgencyNotificationItem,
} from "@/stores/agency-notifications";
import { useAgencyWorkSurfaceStore } from "@/stores/agency-work-surface";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

type UseAgencyNotificationsOptions = {
  teamId: string;
  enabled: boolean;
  segment: AgencySegmentId;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
};

export function useAgencyNotifications({
  teamId,
  enabled,
  segment,
  searchParams,
  setSearchParams,
}: UseAgencyNotificationsOptions) {
  const queryClient = useQueryClient();
  const mergeItems = useAgencyNotificationsStore((state) => state.mergeItems);
  const markItemsRead = useAgencyNotificationsStore((state) => state.markItemsRead);
  const markAllReadLocal = useAgencyNotificationsStore((state) => state.markAllRead);
  const resetTeam = useAgencyNotificationsStore((state) => state.resetTeam);
  const selectedTaskId = useAgencyWorkSurfaceStore((state) => state.selectedTaskId);

  const sinceRef = useRef<string | undefined>(undefined);
  const toastedIdsRef = useRef(new Set<string>());
  const [inboxOpen, setInboxOpenState] = useState(false);
  const previousTeamIdRef = useRef<string>("");

  useEffect(() => {
    if (!enabled || !teamId) return;

    if (previousTeamIdRef.current && previousTeamIdRef.current !== teamId) {
      resetTeam(previousTeamIdRef.current);
      toastedIdsRef.current.clear();
    }
    previousTeamIdRef.current = teamId;

    sinceRef.current = readAgencyNotificationSince(teamId) ?? new Date().toISOString();
    writeAgencyNotificationSince(teamId, sinceRef.current);
  }, [enabled, resetTeam, teamId]);

  const pollQuery = useAgencyNotificationsPollQuery(
    teamId,
    () => sinceRef.current,
    enabled,
  );
  const inboxQuery = useAgencyNotificationsInboxQuery(teamId, enabled && inboxOpen);

  const markReadMutation = useMutation(orpc.agencyOps.notifications.markRead.mutationOptions());
  const markAllReadMutation = useMutation(orpc.agencyOps.notifications.markAllRead.mutationOptions());

  const openTask = useCallback(
    (taskId: string) => {
      openAgencyTask({
        taskId,
        segment,
        searchParams,
        setSearchParams,
      });
    },
    [segment, searchParams, setSearchParams],
  );

  const markNotificationsRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      markItemsRead(teamId, ids);
      await markReadMutation.mutateAsync({ ids });
      void queryClient.invalidateQueries({
        predicate: (query) => JSON.stringify(query.queryKey).includes("notifications"),
      });
    },
    [markItemsRead, markReadMutation, queryClient, teamId],
  );

  const handleIncomingNotifications = useCallback(
    async (items: AgencyNotificationItem[]) => {
      if (items.length === 0) return;

      const suppressThread =
        segment === "work" && selectedTaskId
          ? items.filter((item) => item.taskId === selectedTaskId)
          : [];
      const suppressIds = suppressThread.map((item) => item.id);
      if (suppressIds.length > 0) {
        await markNotificationsRead(suppressIds);
      }

      for (const item of items) {
        if (toastedIdsRef.current.has(item.id)) continue;
        if (suppressIds.includes(item.id)) {
          toastedIdsRef.current.add(item.id);
          continue;
        }
        toastedIdsRef.current.add(item.id);
        showAgencyNotificationToast({
          notification: item,
          onOpenTask: openTask,
        });
      }

      const latestCreatedAt = items.reduce((latest, item) => {
        return item.createdAt > latest ? item.createdAt : latest;
      }, sinceRef.current ?? "");
      if (latestCreatedAt) {
        sinceRef.current = latestCreatedAt;
        writeAgencyNotificationSince(teamId, latestCreatedAt);
      }
    },
    [markNotificationsRead, openTask, segment, selectedTaskId, teamId],
  );

  useEffect(() => {
    if (!pollQuery.data) return;
    mergeItems(teamId, pollQuery.data.items, pollQuery.data.unreadCount);
    void handleIncomingNotifications(pollQuery.data.items);
  }, [handleIncomingNotifications, mergeItems, pollQuery.data, teamId]);

  useEffect(() => {
    if (!inboxQuery.data) return;
    mergeItems(teamId, inboxQuery.data.items, inboxQuery.data.unreadCount);
  }, [inboxQuery.data, mergeItems, teamId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "agency-notification-click") return;
      if (typeof event.data.taskId !== "string") return;
      openTask(event.data.taskId);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [openTask]);

  const setInboxOpen = useCallback((open: boolean) => {
    setInboxOpenState(open);
  }, []);

  const markAllRead = useCallback(async () => {
    markAllReadLocal(teamId);
    await markAllReadMutation.mutateAsync({ teamId });
    toast.success("All notifications marked as read");
    void queryClient.invalidateQueries({
      predicate: (query) => JSON.stringify(query.queryKey).includes("notifications"),
    });
  }, [markAllReadLocal, markAllReadMutation, queryClient, teamId]);

  const enablePushNotifications = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false as const, reason: "unsupported" as const };
    }

    const { publicKey } = await orpcClient.agencyOps.push.getVapidPublicKey();
    if (!publicKey) {
      return { ok: false as const, reason: "not-configured" as const };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false as const, reason: "denied" as const };
    }

    const registration = await navigator.serviceWorker.register("/agency-sw.js", { scope: "/" });
    let subscription = await registration.pushManager.getSubscription();
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return { ok: false as const, reason: "unsupported" as const };
    }

    await orpcClient.agencyOps.push.subscribe({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    });

    return { ok: true as const };
  }, []);

  return {
    openTask,
    markNotificationsRead,
    markAllRead,
    setInboxOpen,
    enablePushNotifications,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}
