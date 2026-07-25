import { useLayoutEffect, type ReactNode } from "react";

import { useAppShellStore } from "@/features/app-shell/app-shell-store";

export type AppShellPageSlot = "dock";

type AppShellPageProps = {
  slots?: AppShellPageSlot[];
  children: ReactNode;
};

export function AppShellPage({ slots = [], children }: AppShellPageProps) {
  const acquireCustomDock = useAppShellStore((s) => s.acquireCustomDock);
  const releaseCustomDock = useAppShellStore((s) => s.releaseCustomDock);

  const wantsDock = slots.includes("dock");

  useLayoutEffect(() => {
    if (!wantsDock) return;
    acquireCustomDock();
    return () => releaseCustomDock();
  }, [wantsDock, acquireCustomDock, releaseCustomDock]);

  return children;
}
