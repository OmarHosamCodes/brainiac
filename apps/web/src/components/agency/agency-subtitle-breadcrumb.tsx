import { useMemo } from "react";
import { cn } from "@/lib/utils";

import { AgencySegmentBar } from "@/components/agency/agency-segment-bar";
import type { AgencySegmentId } from "@/lib/agency-segments";
import type { AgencySyncState } from "@/lib/queries/agency-sync";

type AgencySubtitleBreadcrumbProps = {
  segment: AgencySegmentId;
  syncState?: AgencySyncState;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function AgencySubtitleBreadcrumb({
  segment,
  syncState,
  onSegmentChange,
}: AgencySubtitleBreadcrumbProps) {
  const syncStatusLabel = useMemo(() => {
    if (!syncState) return "";
    switch (syncState) {
      case "synced":
        return "Synced";
      case "syncing":
        return "Syncing…";
      case "error":
        return "Sync interrupted";
      case "loading":
        return "Loading";
      default: {
        const _exhaustive: never = syncState;
        return _exhaustive;
      }
    }
  }, [syncState]);

  const syncStatusDotClass = useMemo(() => {
    if (!syncState) return "bg-muted";
    switch (syncState) {
      case "synced":
        return "bg-success";
      case "error":
        return "bg-error";
      case "syncing":
      case "loading":
        return "bg-muted";
      default: {
        const _exhaustive: never = syncState;
        return _exhaustive;
      }
    }
  }, [syncState]);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <AgencySegmentBar segment={segment} onSegmentChange={onSegmentChange} variant="breadcrumb" />

      {syncState ? (
        <div
          className="inline-flex shrink-0 items-center"
          title={syncStatusLabel}
          role="status"
          aria-label={syncStatusLabel}
          aria-live={syncState === "error" ? "assertive" : "polite"}
        >
          <span
            className={cn("inline-block size-1.5 rounded-full", syncStatusDotClass)}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
