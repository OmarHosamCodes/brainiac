import { RefreshCw } from "lucide-react";

import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { shellFocusRingClass, shellTopbarChipClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

export function AppShellUpdateControl() {
  const updateAvailable = useAppUpdateStore((s) => s.updateAvailable);
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);
  const beginRefresh = useAppUpdateStore((s) => s.beginRefresh);

  if (!updateAvailable || isRefreshing) return null;

  return (
    <button
      type="button"
      className={cn(shellTopbarChipClass, shellFocusRingClass)}
      aria-label="Update available, refresh"
      onClick={() => {
        void beginRefresh();
      }}
    >
      <RefreshCw className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="hidden truncate sm:inline">Refresh</span>
    </button>
  );
}
