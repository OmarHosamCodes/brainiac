import { useEffect, useLayoutEffect, type ReactNode } from "react";

import { useAppShellStore } from "@/stores/app-shell";

export type AppShellPageSlot =
  | "context"
  | "pageCrumb"
  | "subtitle"
  | "actions"
  | "dock"
  | "hideAgent";

type AppShellPageProps = {
  /** Second breadcrumb — current tab or section inside the page. */
  subtitle?: string | null;
  slots?: AppShellPageSlot[];
  children: ReactNode;
};

export function AppShellPage({ subtitle = null, slots = [], children }: AppShellPageProps) {
  const setPageSubtitle = useAppShellStore((s) => s.setPageSubtitle);
  const acquireCustomDock = useAppShellStore((s) => s.acquireCustomDock);
  const releaseCustomDock = useAppShellStore((s) => s.releaseCustomDock);
  const acquireContextSlot = useAppShellStore((s) => s.acquireContextSlot);
  const releaseContextSlot = useAppShellStore((s) => s.releaseContextSlot);
  const acquirePageCrumbSlot = useAppShellStore((s) => s.acquirePageCrumbSlot);
  const releasePageCrumbSlot = useAppShellStore((s) => s.releasePageCrumbSlot);
  const acquireSubtitleSlot = useAppShellStore((s) => s.acquireSubtitleSlot);
  const releaseSubtitleSlot = useAppShellStore((s) => s.releaseSubtitleSlot);
  const acquireActionsSlot = useAppShellStore((s) => s.acquireActionsSlot);
  const releaseActionsSlot = useAppShellStore((s) => s.releaseActionsSlot);
  const acquireAgentButtonHidden = useAppShellStore((s) => s.acquireAgentButtonHidden);
  const releaseAgentButtonHidden = useAppShellStore((s) => s.releaseAgentButtonHidden);
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);

  const wantsDock = slots.includes("dock");
  const wantsContext = slots.includes("context");
  const wantsPageCrumb = slots.includes("pageCrumb");
  const wantsSubtitle = slots.includes("subtitle");
  const wantsActions = slots.includes("actions");
  const wantsHideAgent = slots.includes("hideAgent");

  useEffect(() => {
    const nextSubtitle = subtitle ?? null;
    setPageSubtitle(nextSubtitle);
    return () => {
      const current = useAppShellStore.getState().pageSubtitle;
      if (current === nextSubtitle) {
        setPageSubtitle(null);
      }
    };
  }, [subtitle, setPageSubtitle]);

  useLayoutEffect(() => {
    if (!wantsDock) return;
    acquireCustomDock();
    return () => releaseCustomDock();
  }, [wantsDock, acquireCustomDock, releaseCustomDock]);

  useLayoutEffect(() => {
    if (!wantsContext) return;
    acquireContextSlot();
    return () => releaseContextSlot();
  }, [wantsContext, acquireContextSlot, releaseContextSlot]);

  useLayoutEffect(() => {
    if (!wantsPageCrumb) return;
    acquirePageCrumbSlot();
    return () => releasePageCrumbSlot();
  }, [wantsPageCrumb, acquirePageCrumbSlot, releasePageCrumbSlot]);

  useLayoutEffect(() => {
    if (!wantsSubtitle) return;
    acquireSubtitleSlot();
    return () => releaseSubtitleSlot();
  }, [wantsSubtitle, acquireSubtitleSlot, releaseSubtitleSlot]);

  useLayoutEffect(() => {
    if (!wantsActions) return;
    acquireActionsSlot();
    return () => releaseActionsSlot();
  }, [wantsActions, acquireActionsSlot, releaseActionsSlot]);

  useLayoutEffect(() => {
    if (!wantsHideAgent) return;
    setAgentDockOpen(false);
    acquireAgentButtonHidden();
    return () => releaseAgentButtonHidden();
  }, [wantsHideAgent, setAgentDockOpen, acquireAgentButtonHidden, releaseAgentButtonHidden]);

  return children;
}
