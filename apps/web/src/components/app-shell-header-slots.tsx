import type { ReactNode } from "react";

import { AppShellPortal } from "@/hooks/use-app-shell-portal";
import {
  shellActionsSlotClass,
  shellHeaderContextInnerClass,
} from "@/lib/utils/app-shell-ui";

export function AppShellHeaderContext({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId="app-shell-context">
      <div className={shellHeaderContextInnerClass}>{children}</div>
    </AppShellPortal>
  );
}

export function AppShellHeaderActions({ children }: { children: ReactNode }) {
  return (
    <AppShellPortal targetId="app-shell-actions">
      <div className={shellActionsSlotClass}>{children}</div>
    </AppShellPortal>
  );
}
