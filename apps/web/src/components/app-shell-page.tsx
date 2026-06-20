import { useEffect, type ReactNode } from "react";

import { useAppShellStore } from "@/stores/app-shell";

export type AppShellPageSlot = "context" | "actions" | "dock";

type AppShellPageProps = {
  title?: string | null;
  slots?: AppShellPageSlot[];
  children: ReactNode;
};

export function AppShellPage({ title = null, slots = [], children }: AppShellPageProps) {
  const setPageTitle = useAppShellStore((s) => s.setPageTitle);
  const acquireCustomDock = useAppShellStore((s) => s.acquireCustomDock);
  const releaseCustomDock = useAppShellStore((s) => s.releaseCustomDock);
  const acquireContextSlot = useAppShellStore((s) => s.acquireContextSlot);
  const releaseContextSlot = useAppShellStore((s) => s.releaseContextSlot);
  const acquireActionsSlot = useAppShellStore((s) => s.acquireActionsSlot);
  const releaseActionsSlot = useAppShellStore((s) => s.releaseActionsSlot);

  const wantsDock = slots.includes("dock");
  const wantsContext = slots.includes("context");
  const wantsActions = slots.includes("actions");

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

  useEffect(() => {
    if (!wantsDock) return;
    acquireCustomDock();
    return () => releaseCustomDock();
  }, [wantsDock, acquireCustomDock, releaseCustomDock]);

  useEffect(() => {
    if (!wantsContext) return;
    acquireContextSlot();
    return () => releaseContextSlot();
  }, [wantsContext, acquireContextSlot, releaseContextSlot]);

  useEffect(() => {
    if (!wantsActions) return;
    acquireActionsSlot();
    return () => releaseActionsSlot();
  }, [wantsActions, acquireActionsSlot, releaseActionsSlot]);

  return children;
}
