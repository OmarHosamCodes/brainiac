import { Check, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { shellFocusRingClass, shellSearchIconButtonClass } from "@/lib/utils/app-shell-ui";

type AgencyTeamBreadcrumbProps = {
  teamId: string;
  teams: Array<{ id: string; name: string }>;
  onTeamIdChange: (teamId: string) => void;
};

export function AgencyTeamBreadcrumb({ teamId, teams, onTeamIdChange }: AgencyTeamBreadcrumbProps) {
  const [open, setOpen] = useState(false);
  const currentTeam = useMemo(
    () => teams.find((team) => team.id === teamId) ?? teams[0] ?? null,
    [teams, teamId],
  );

  if (teams.length <= 1) {
    return null;
  }

  function selectTeam(nextTeamId: string) {
    setOpen(false);
    if (nextTeamId === teamId) return;
    onTeamIdChange(nextTeamId);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={[shellSearchIconButtonClass, shellFocusRingClass].join(" ")}
          aria-label={`Switch team (${currentTeam?.name ?? "Team"})`}
          aria-expanded={open}
        >
          <UsersRound className="size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
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
  );
}
