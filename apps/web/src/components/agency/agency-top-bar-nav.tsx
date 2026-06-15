import { Check, ChevronDown, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgencySegmentId } from "@/lib/agency-segments";
import { AGENCY_SEGMENTS } from "@/lib/agency-segments";
import type { AgencyLiveConnectionState } from "@/lib/utils/agency-live-rpc";
import {
  shellBreadcrumbCurrentClass,
  shellBreadcrumbMutedClass,
  shellBreadcrumbSeparatorClass,
  shellFocusRingClass,
  shellTopbarChipClass,
} from "@/lib/utils/app-shell-ui";

type AgencyTopBarNavProps = {
  segment: AgencySegmentId;
  teamId: string;
  teams: Array<{ id: string; name: string }>;
  connectionState?: AgencyLiveConnectionState;
  onSegmentChange: (segment: AgencySegmentId) => void;
  onTeamIdChange: (teamId: string) => void;
};

export function AgencyTopBarNav({
  segment,
  teamId,
  teams,
  connectionState,
  onSegmentChange,
  onTeamIdChange,
}: AgencyTopBarNavProps) {
  const [teamSelectorOpen, setTeamSelectorOpen] = useState(false);

  const currentSegment = useMemo(
    () => AGENCY_SEGMENTS.find((entry) => entry.id === segment) ?? AGENCY_SEGMENTS[0]!,
    [segment],
  );
  const currentTeam = useMemo(
    () => teams.find((team) => team.id === teamId) ?? teams[0] ?? null,
    [teams, teamId],
  );
  const isMultiTeam = teams.length > 1;

  const liveStatusLabel = useMemo(() => {
    if (!connectionState) return "";
    switch (connectionState) {
      case "live":
        return "Live sync";
      case "reconnecting":
        return "Reconnecting";
      case "error":
        return "Sync interrupted";
      case "connecting":
        return "Connecting";
      default: {
        const _exhaustive: never = connectionState;
        return _exhaustive;
      }
    }
  }, [connectionState]);

  const liveStatusDotClass = useMemo(() => {
    if (!connectionState) return "bg-muted";
    switch (connectionState) {
      case "live":
        return "bg-success";
      case "error":
        return "bg-error";
      case "reconnecting":
      case "connecting":
        return "bg-muted";
      default: {
        const _exhaustive: never = connectionState;
        return _exhaustive;
      }
    }
  }, [connectionState]);

  function selectSegment(nextSegment: AgencySegmentId) {
    if (nextSegment === segment) return;
    onSegmentChange(nextSegment);
  }

  function selectTeam(nextTeamId: string) {
    setTeamSelectorOpen(false);
    if (nextTeamId === teamId) return;
    onTeamIdChange(nextTeamId);
  }

  useEffect(() => {
    let pendingPrefix = false;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPrefix() {
      pendingPrefix = false;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        clearPrefix();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        clearPrefix();
        return;
      }

      const key = event.key.toLowerCase();

      if (!pendingPrefix) {
        if (key === "g") {
          pendingPrefix = true;
          prefixTimer = setTimeout(clearPrefix, 1_000);
          return;
        }
        return;
      }

      const match = AGENCY_SEGMENTS.find((entry) => entry.shortcutKey === key);
      if (match) {
        event.preventDefault();
        selectSegment(match.id);
      }
      clearPrefix();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      clearPrefix();
    };
  }, [segment, onSegmentChange]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={shellBreadcrumbMutedClass}>Agency</span>
      <span className={shellBreadcrumbSeparatorClass} aria-hidden="true">
        /
      </span>

      {isMultiTeam ? (
        <Popover open={teamSelectorOpen} onOpenChange={setTeamSelectorOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={[shellTopbarChipClass, shellFocusRingClass, "max-w-[9rem]"].join(" ")}
            >
              <Users className="size-3.5 shrink-0 text-muted" />
              <span className="truncate">{currentTeam?.name ?? "Team"}</span>
              <ChevronDown className="size-3 shrink-0 text-muted" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={[
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted",
                  team.id === teamId ? "bg-primary/10 text-primary" : "",
                ].join(" ")}
                onClick={() => selectTeam(team.id)}
              >
                <span className="truncate">{team.name}</span>
                {team.id === teamId ? <Check className="size-3.5 shrink-0" /> : null}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      ) : currentTeam ? (
        <div
          className={[shellTopbarChipClass, "max-w-[9rem]"].join(" ")}
          title={`Team · ${currentTeam.name}`}
        >
          <Users className="size-3.5 shrink-0 text-muted" />
          <span className="truncate">{currentTeam.name}</span>
        </div>
      ) : null}

      <span className={shellBreadcrumbSeparatorClass} aria-hidden="true">
        /
      </span>

      <span className={shellBreadcrumbCurrentClass}>{currentSegment.label}</span>

      {connectionState ? (
        <div
          className="ml-0.5 inline-flex shrink-0 items-center"
          title={liveStatusLabel}
          role="status"
          aria-label={liveStatusLabel}
          aria-live={connectionState === "error" ? "assertive" : "polite"}
        >
          <span
            className={["inline-block size-1.5 rounded-full", liveStatusDotClass].join(" ")}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
