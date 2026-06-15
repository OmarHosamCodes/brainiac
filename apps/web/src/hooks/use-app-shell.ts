import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useAppShellStore } from "@/stores/app-shell";

export function useAppShellPathSync() {
  const location = useLocation();
  const setCurrentPath = useAppShellStore((s) => s.setCurrentPath);

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);
}

export function useAppShellPageTitle(title: string | null | undefined) {
  const setPageTitle = useAppShellStore((s) => s.setPageTitle);

  useEffect(() => {
    const nextTitle = title ?? null;
    setPageTitle(nextTitle);
    return () => {
      const current = useAppShellStore.getState().pageTitle;
      if (current === nextTitle) {
        setPageTitle(null);
      }
    };
  }, [title, setPageTitle]);
}

export function useAppShellCustomDock() {
  const acquire = useAppShellStore((s) => s.acquireCustomDock);
  const release = useAppShellStore((s) => s.releaseCustomDock);

  useEffect(() => {
    acquire();
    return () => release();
  }, [acquire, release]);
}

export function useAppShellContextSlot() {
  const acquire = useAppShellStore((s) => s.acquireContextSlot);
  const release = useAppShellStore((s) => s.releaseContextSlot);

  useEffect(() => {
    acquire();
    return () => release();
  }, [acquire, release]);
}

export function useAppShellActionsSlot() {
  const acquire = useAppShellStore((s) => s.acquireActionsSlot);
  const release = useAppShellStore((s) => s.releaseActionsSlot);

  useEffect(() => {
    acquire();
    return () => release();
  }, [acquire, release]);
}
