import { useState, useCallback } from "react";
import { ChevronLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type DashboardWorkspaceSidebarProps = {
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
  teamsCount: number;
  selectedTeamId: string;
  onSelectedTeamChange: (teamId: string) => void;
  teams: Array<{ id: string; name: string }>;
  onCreateTeam: (name: string) => void;
  selectedNodeTitle: string | null;
  isSelectedNodeShared: boolean;
  canManageSharing: boolean;
  onToggleNodeSharing: () => void;
  onOpenTeamSettings: () => void;
};

export function DashboardWorkspaceSidebar({
  compact,
  onCompactChange,
  teamsCount,
  selectedTeamId,
  onSelectedTeamChange,
  teams,
  onCreateTeam,
  selectedNodeTitle,
  isSelectedNodeShared,
  canManageSharing,
  onToggleNodeSharing,
  onOpenTeamSettings,
}: DashboardWorkspaceSidebarProps) {
  const [newTeamName, setNewTeamName] = useState("");

  const handleCreateTeam = useCallback(() => {
    if (newTeamName.trim()) {
      onCreateTeam(newTeamName);
      setNewTeamName("");
    }
  }, [newTeamName, onCreateTeam]);

  const sidebarWidth = compact ? "w-14" : "w-[22rem]";

  if (compact) {
    return (
      <aside
        className={`${sidebarWidth} flex flex-col items-center gap-3 border-r bg-card py-4 transition-[width] duration-200`}
      >
        <Button
          size="lg"
          variant="ghost"
          className="h-10 w-10 rounded-2xl"
          onClick={() => onCompactChange(false)}
          title="Expand workspace sidebar"
        >
          <Users className="h-5 w-5" />
        </Button>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
          Team
        </span>
      </aside>
    );
  }

  return (
    <aside className={`${sidebarWidth} border-r bg-card overflow-y-auto px-4 py-4 transition-[width] duration-200`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {teamsCount} total
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onCompactChange(true)}
              title="Compact workspace sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Create Team */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="New team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTeam();
              }}
              className="flex-1 h-9"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCreateTeam}
              disabled={!newTeamName.trim()}
            >
              Create
            </Button>
          </div>
        </div>

        {/* Share Target */}
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Share Target
          </Label>
          <Select value={selectedTeamId} onValueChange={onSelectedTeamChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Team Management */}
        <section className="rounded-2xl border bg-background p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Team Management
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Open the dedicated team settings modal to manage members and access rules.
          </p>
          <Button
            size="sm"
            onClick={onOpenTeamSettings}
            disabled={!selectedTeamId}
            className="mt-3 w-full"
          >
            Manage Team
          </Button>
        </section>

        {/* Selected Node */}
        <section className="rounded-2xl border bg-background p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Selected Node
          </p>
          <p className="mt-1 truncate text-sm font-semibold">
            {selectedNodeTitle || "No node selected"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedNodeTitle
              ? isSelectedNodeShared
                ? `Shared to team`
                : "Private node"
              : "Click a node on canvas to share it."}
          </p>

          {canManageSharing && selectedNodeTitle && (
            <Button
              size="sm"
              variant={isSelectedNodeShared ? "outline" : "default"}
              onClick={onToggleNodeSharing}
              className="mt-3 w-full"
            >
              {isSelectedNodeShared ? "Unshare Node" : "Share Node"}
            </Button>
          )}
        </section>
      </div>
    </aside>
  );
}
