import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { AppShellBreadcrumbs } from "@/features/app-shell/app-shell-breadcrumbs";
import { AppShellPortal } from "@/features/app-shell/app-shell-portal";
import { Button } from "@/ui/button";
import {
  useAppShellStore,
  useHasContextContent,
  useShellMode,
  useAgentButtonHidden,
} from "@/features/app-shell/app-shell-store";
import {
  shellActionsSlotClass,
  shellContextDividerClass,
  shellContextSlotClass,
  shellHeaderActionsRegionClass,
  shellHeaderContextInnerClass,
  shellHeaderContextRegionClass,
  shellHeaderUtilityActionClass,
  shellTopbarBaseClass,
  shellTopbarExecutionClass,
  shellTopbarSpatialClass,
  shellUtilityClusterClass,
} from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

export {
  AppShellTopbarPageCrumb,
  AppShellTopbarSubtitle,
} from "@/features/app-shell/app-shell-breadcrumbs";

export const APP_SHELL_CONTEXT_SLOT_ID = "app-shell-context";
export const APP_SHELL_ACTIONS_SLOT_ID = "app-shell-actions";
export const APP_SHELL_TRAILING_SLOT_ID = "app-shell-trailing";

export function AppShellTopbarContext({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId={APP_SHELL_CONTEXT_SLOT_ID}>
      <div className={shellHeaderContextInnerClass}>{children}</div>
    </AppShellPortal>
  );
}

export function AppShellTopbarActions({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId={APP_SHELL_ACTIONS_SLOT_ID}>
      <div className={shellActionsSlotClass}>{children}</div>
    </AppShellPortal>
  );
}

export function AppShellTopbarTrailing({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId={APP_SHELL_TRAILING_SLOT_ID}>
      <div className={shellActionsSlotClass}>{children}</div>
    </AppShellPortal>
  );
}

export function AppShellTopbarSkeleton() {
  return (
    <header className={cn(shellTopbarBaseClass, shellTopbarExecutionClass)} aria-hidden="true">
      <div className={shellHeaderContextRegionClass}>
        <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
      </div>
      <div className={shellUtilityClusterClass}>
        <div className={shellHeaderActionsRegionClass}>
          <div className="size-9 animate-pulse rounded-xl bg-muted/40" />
        </div>
        <div className="h-9 w-16 animate-pulse rounded-xl bg-muted/40" />
      </div>
    </header>
  );
}

export function AppShellTopbar() {
  const location = useLocation();
  const hasContextContent = useHasContextContent();
  const shellMode = useShellMode();
  const agentDockOpen = useAppShellStore((s) => s.agentDockOpen);
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const hasPageActions = useAppShellStore((s) => s.actionsOwnerCount > 0);
  const agentButtonHidden = useAgentButtonHidden();
  const isSpatialMode = shellMode === "spatial";

  return (
    <header
      className={cn(
        shellTopbarBaseClass,
        isSpatialMode ? shellTopbarSpatialClass : shellTopbarExecutionClass,
        hasContextContent ? "app-shell__topbar--owned" : "",
      )}
      role="banner"
      aria-label="Application header"
    >
      <div className={shellHeaderContextRegionClass}>
        {hasContextContent ? (
          <div id={APP_SHELL_CONTEXT_SLOT_ID} className={shellContextSlotClass} />
        ) : null}
        <AppShellBreadcrumbs pathname={location.pathname} />
      </div>

      <div className={shellUtilityClusterClass}>
        <div id={APP_SHELL_ACTIONS_SLOT_ID} className={shellHeaderActionsRegionClass} />
        {hasPageActions ? <span className={shellContextDividerClass} aria-hidden="true" /> : null}
        <div id={APP_SHELL_TRAILING_SLOT_ID} className={shellHeaderActionsRegionClass} />
        {agentButtonHidden ? null : (
          <Button
            type="button"
            variant={agentDockOpen ? "secondary" : "ghost"}
            size="sm"
            className={shellHeaderUtilityActionClass}
            aria-label={agentDockOpen ? "Close agent dock" : "Open agent dock"}
            aria-keyshortcuts="Control+J Meta+J"
            onClick={() => setAgentDockOpen(!agentDockOpen)}
          >
            {agentDockOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
            <span className="hidden sm:inline">{agentDockOpen ? "Close" : "Agent"}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
