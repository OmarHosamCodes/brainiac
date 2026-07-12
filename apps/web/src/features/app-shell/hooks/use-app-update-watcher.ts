import { useEffect } from "react";

import {
  APP_UPDATE_POLL_MS,
  fetchRemoteAppBuildId,
  getLocalAppBuildId,
  isChunkLoadFailureReason,
  isRemoteBuildNewer,
} from "@/features/app-shell/app-update";
import { useAppUpdateStore } from "@/features/app-shell/app-update-store";

async function checkForAppUpdate(): Promise<void> {
  if (!import.meta.env.PROD) return;
  if (useAppUpdateStore.getState().isRefreshing) return;

  const remoteBuildId = await fetchRemoteAppBuildId();
  if (isRemoteBuildNewer(getLocalAppBuildId(), remoteBuildId)) {
    useAppUpdateStore.getState().markUpdateAvailable();
  }
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  if (isChunkLoadFailureReason(event.reason)) {
    useAppUpdateStore.getState().markUpdateAvailable();
  }
}

function handleWindowError(event: ErrorEvent): void {
  if (isChunkLoadFailureReason(event.error ?? event.message)) {
    useAppUpdateStore.getState().markUpdateAvailable();
  }
}

/** Polls /version.json and watches for stale-chunk failures. Mount once under AppShell. */
export function useAppUpdateWatcher(): void {
  useEffect(() => {
    void checkForAppUpdate();

    const intervalId = window.setInterval(() => {
      void checkForAppUpdate();
    }, APP_UPDATE_POLL_MS);

    function onVisibilityOrFocus() {
      if (document.visibilityState === "hidden") return;
      void checkForAppUpdate();
    }

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);
}
