import { RefreshCw } from "lucide-react";

import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import {
  shellFocusRingClass,
  shellRailExpandedLinkClass,
  shellRailIconClass,
  shellRailLinkBaseClass,
  shellTopbarChipClass,
} from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

type AppShellUpdateControlProps = {
  variant: "rail" | "mobile";
  expanded?: boolean;
};

export function AppShellUpdateControl({ variant, expanded = true }: AppShellUpdateControlProps) {
  const updateAvailable = useAppUpdateStore((s) => s.updateAvailable);
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);
  const beginRefresh = useAppUpdateStore((s) => s.beginRefresh);

  if (!updateAvailable || isRefreshing) return null;

  if (variant === "mobile") {
    return (
      <button
        type="button"
        className={cn(shellTopbarChipClass, shellFocusRingClass, "md:hidden")}
        aria-label="Update available, refresh"
        onClick={() => {
          void beginRefresh();
        }}
      >
        <RefreshCw className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">Refresh</span>
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className={cn(
          shellRailLinkBaseClass,
          shellFocusRingClass,
          "border border-primary/30 bg-primary/10 text-primary",
        )}
        aria-label="Update available, refresh"
        title="Update available"
        onClick={() => {
          void beginRefresh();
        }}
      >
        <RefreshCw className={shellRailIconClass} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        shellRailExpandedLinkClass,
        "border border-primary/30 bg-primary/10 text-primary",
      )}
      aria-label="Update available, refresh"
      onClick={() => {
        void beginRefresh();
      }}
    >
      <RefreshCw className={shellRailIconClass} aria-hidden="true" />
      <span className="app-shell__rail-label min-w-0 truncate">
        <span className="block truncate text-[11px] font-medium text-primary/80">
          Update available
        </span>
        <span className="block truncate text-[13px] font-semibold">Refresh</span>
      </span>
    </button>
  );
}
