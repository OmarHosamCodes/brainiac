import { useQuery } from "@tanstack/react-query";
import { Briefcase, LayoutDashboard, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { APP_NAV_ITEMS } from "@/features/app-shell/app-navigation";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { authClient } from "@/lib/auth-client";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/ui/command";

const NAV_ICONS = {
  "/canvas": LayoutDashboard,
  "/agency": Briefcase,
} as const;

export function AppShellCommandPalette() {
  const navigate = useNavigate();
  const open = useAppShellStore((s) => s.commandPaletteOpen);
  const setOpen = useAppShellStore((s) => s.setCommandPaletteOpen);
  const setSelectedTeamId = useTeamStore((s) => s.setSelectedTeamId);
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled && open,
  });

  const teams = teamListQuery.data?.items ?? [];

  function close() {
    setOpen(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Jump to a page, team, or recent work"
    >
      <Command>
        <CommandInput placeholder="Search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigate">
            {APP_NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS] ?? LayoutDashboard;
              return (
                <CommandItem
                  key={item.to}
                  value={`${item.label} ${item.to}`}
                  onSelect={() => {
                    navigate(item.to);
                    close();
                  }}
                >
                  <Icon />
                  {item.label}
                  <CommandShortcut>Go</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {teams.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Teams">
                {teams.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={`team ${team.name}`}
                    onSelect={() => {
                      setSelectedTeamId(team.id);
                      close();
                    }}
                  >
                    <Users />
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                    {team.id === selectedTeamId ? <CommandShortcut>Current</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
