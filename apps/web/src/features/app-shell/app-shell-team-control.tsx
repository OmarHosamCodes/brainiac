import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus, Settings2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { shellFocusRingClass, shellTopbarChipClass } from "@/features/app-shell/app-shell-ui";
import { teamDetailQueryOptions, teamListQueryOptions } from "@/features/team/team-queries";
import { TeamSettingsModal } from "@/features/team/team-settings-modal";
import { useTeamStore } from "@/features/team/team-store";
import { authClient } from "@/lib/auth-client";
import { teamCreateFormSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

type TeamRole = "owner" | "editor" | "viewer";

function roleLabel(role: TeamRole | null | undefined) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  if (role === "viewer") return "Viewer";
  return null;
}

type AppShellTeamControlProps = {
  className?: string;
  compact?: boolean;
};

export function AppShellTeamControl({ className, compact = false }: AppShellTeamControlProps) {
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const setSelectedTeamId = useTeamStore((s) => s.setSelectedTeamId);
  const createTeamPending = useTeamStore((s) => s.createTeamPending);
  const createTeam = useTeamStore((s) => s.createTeam);

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teamDetailQuery = useQuery({
    ...teamDetailQueryOptions(selectedTeamId),
    enabled: Boolean(authEnabled && selectedTeamId),
  });

  const teams = useMemo(() => teamListQuery.data?.items ?? [], [teamListQuery.data?.items]);
  const selectedTeam = teamDetailQuery.data ?? null;
  const selectedSummary = teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  const displayName = selectedTeam?.name ?? selectedSummary?.name ?? "";
  const displayRole = (selectedTeam?.role ?? selectedSummary?.role ?? null) as TeamRole | null;

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  const createTeamForm = useForm({
    resolver: zodResolver(teamCreateFormSchema),
    defaultValues: { name: "" },
  });

  if (!authEnabled) {
    return null;
  }

  if (teamListQuery.isPending) {
    return <Skeleton className={cn("h-8 w-28 rounded-full", className)} />;
  }

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) {
            setCreateOpen(false);
            createTeamForm.reset();
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(shellTopbarChipClass, shellFocusRingClass, "max-w-[12rem]", className)}
            aria-label={displayName ? `Team: ${displayName}` : "Select team"}
            aria-expanded={menuOpen}
          >
            <Users className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{displayName || "Create team"}</span>
            {displayRole && !compact ? (
              <Badge variant="secondary" className="hidden shrink-0 lg:inline-flex">
                {roleLabel(displayRole)}
              </Badge>
            ) : null}
            <ChevronsUpDown className="size-3.5 shrink-0 text-dimmed" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          {createOpen ? (
            <div className="p-2">
              <Form {...createTeamForm}>
                <form
                  className="flex flex-col gap-2"
                  onSubmit={createTeamForm.handleSubmit(async (values) => {
                    await createTeam(values.name);
                    createTeamForm.reset();
                    setCreateOpen(false);
                    setMenuOpen(false);
                  })}
                >
                  <FormField
                    control={createTeamForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Team name</FormLabel>
                        <FormControl>
                          <Input placeholder="Team name" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" type="submit" disabled={createTeamPending}>
                      {createTeamPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Create
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        createTeamForm.reset();
                        setCreateOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <>
              <DropdownMenuLabel className="font-normal text-muted">
                {teams.length === 0 ? "No teams yet" : "Switch team"}
              </DropdownMenuLabel>
              {teams.length > 0 ? (
                <DropdownMenuGroup>
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onSelect={() => {
                        setSelectedTeamId(team.id);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{team.name}</span>
                      {team.id === selectedTeamId ? (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ) : null}

              <DropdownMenuSeparator />

              {selectedTeamId ? (
                <DropdownMenuItem
                  onSelect={() => {
                    setSettingsOpen(true);
                  }}
                >
                  <Settings2 />
                  Team settings
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setCreateOpen(true);
                }}
              >
                <Plus />
                Create team
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TeamSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        team={selectedTeam}
        onRefetchWorkspace={async () => {
          await teamDetailQuery.refetch();
        }}
      />
    </>
  );
}
