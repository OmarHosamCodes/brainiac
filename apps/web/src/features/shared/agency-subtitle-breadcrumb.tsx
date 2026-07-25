import { useMemo, useState } from "react";

import { shellFocusRingClass, shellLabelClass } from "@/features/app-shell/app-shell-ui";
import { useAgencySyncDetails } from "@/features/shared/agency-sync";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type AgencySubtitleBreadcrumbProps = {
  teamId: string;
};

export function AgencySubtitleBreadcrumb({ teamId }: AgencySubtitleBreadcrumbProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const syncDetails = useAgencySyncDetails(teamId);

  const syncStatusDotClass = useMemo(() => {
    switch (syncDetails.state) {
      case "synced":
        return "bg-success";
      case "error":
        return "bg-error";
      case "syncing":
      case "loading":
        return "bg-muted";
      default: {
        const _exhaustive: never = syncDetails.state;
        return _exhaustive;
      }
    }
  }, [syncDetails.state]);

  if (!teamId) return null;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-elevated",
              shellFocusRingClass,
            )}
            aria-label={`${syncDetails.label}. Show sync details`}
            aria-expanded={detailsOpen}
          >
            <span
              className={cn("inline-block size-1.5 rounded-full", syncStatusDotClass)}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3 p-3">
          <div className="space-y-1">
            <p className={shellLabelClass}>Sync status</p>
            <p className="text-sm font-semibold text-highlighted">{syncDetails.label}</p>
            <p className="text-xs leading-relaxed text-muted">{syncDetails.description}</p>
          </div>

          {syncDetails.fetchingCount > 0 ? (
            <div className="space-y-1">
              <p className={shellLabelClass}>In flight</p>
              <p className="text-xs text-muted">
                {syncDetails.fetchingCount}{" "}
                {syncDetails.fetchingCount === 1 ? "request" : "requests"}
                {syncDetails.activeLabels.length > 0
                  ? `: ${syncDetails.activeLabels.join(", ")}`
                  : ""}
              </p>
            </div>
          ) : null}

          {syncDetails.errors.length > 0 ? (
            <div className="space-y-2">
              <p className={shellLabelClass}>Failed sources</p>
              <ul className="space-y-2">
                {syncDetails.errors.map((error) => (
                  <li
                    key={`${error.label}-${error.message}`}
                    className="rounded-xl border border-error/20 bg-error/5 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-highlighted">{error.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{error.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
