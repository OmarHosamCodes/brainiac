import {
  Globe,
  Loader2,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { teamCreateFormSchema } from "@/lib/schemas";
import {
  dashboardCardClass,
  dashboardCardHeaderClass,
  dashboardCardIconClass,
  dashboardLabelClass,
  dashboardSectionClass,
} from "@/lib/utils/dashboard-ui";
import { shellFocusRingClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

type TeamRole = "owner" | "editor" | "viewer";

type DashboardSelectedNode = {
  title?: string | null;
  visibility?: string | null;
  teamId?: string | null;
};

type DashboardWorkspaceSidebarProps = {
  compact: boolean;
  teamsCount: number;
  createTeamPending?: boolean;
  selectedTeamName: string;
  selectedTeamRole: TeamRole | null;
  memberCount: number;
  selectedNode: DashboardSelectedNode | null;
  canInvite: boolean;
  canManageSelectedNodeSharing: boolean;
  isSelectedNodeShared: boolean;
  isNodeShareActionPending: boolean;
  nodeShareActionLabel: string;
  nodeShareActionDisabled: boolean;
  onCompactChange: (value: boolean) => void;
  onCreateTeam: (name: string) => Promise<void>;
  onOpenTeamSettings: () => void;
  onToggleSelectedNodeSharing: () => void;
};

export function DashboardWorkspaceSidebar({
  compact,
  teamsCount,
  createTeamPending = false,
  selectedTeamName,
  selectedTeamRole,
  memberCount,
  selectedNode,
  canInvite,
  canManageSelectedNodeSharing,
  isSelectedNodeShared,
  isNodeShareActionPending,
  nodeShareActionLabel,
  nodeShareActionDisabled,
  onCompactChange,
  onCreateTeam,
  onOpenTeamSettings,
  onToggleSelectedNodeSharing,
}: DashboardWorkspaceSidebarProps) {
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  const createTeamForm = useForm({
    resolver: zodResolver(teamCreateFormSchema),
    defaultValues: { name: "" },
  });

  const roleLabel = useMemo(() => {
    switch (selectedTeamRole) {
      case "owner":
        return "Owner";
      case "editor":
        return "Editor";
      case "viewer":
        return "Viewer";
      default:
        return null;
    }
  }, [selectedTeamRole]);

  const nodeShareStatus = useMemo(() => {
    if (!selectedNode) {
      return {
        label: "No node selected",
        hint: "Select a node on the canvas to manage sharing.",
      };
    }

    if (selectedNode.visibility === "team") {
      return {
        label: `Shared with ${selectedTeamName || "team"}`,
        hint: canManageSelectedNodeSharing ? "Visible to all team members." : "Team-shared node.",
      };
    }

    return {
      label: "Private",
      hint: canManageSelectedNodeSharing
        ? "Only you can access this node."
        : "Your role cannot change sharing.",
    };
  }, [canManageSelectedNodeSharing, selectedNode, selectedTeamName]);

  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col border-r border-default bg-default",
        compact
          ? "dashboard-sidebar-compact w-14 items-center gap-2 py-3"
          : "dashboard-sidebar w-72 xl:w-80",
      )}
    >
      {compact ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand team panel"
            onClick={() => onCompactChange(false)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
          <div
            className="flex size-9 items-center justify-center rounded-xl border border-default bg-muted/40 text-muted"
            title={selectedTeamName || "Team"}
          >
            <Users className="size-4" />
          </div>
          {selectedNode ? (
            <div
              className="flex size-9 items-center justify-center rounded-xl border border-default bg-muted/40 text-muted"
              title={selectedNode.title ?? "Selected node"}
            >
              {isSelectedNodeShared ? <Globe className="size-4" /> : <Lock className="size-4" />}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <header className="flex w-full items-center justify-between gap-2 border-b border-default px-4 py-3">
            <div className="min-w-0">
              <p className={dashboardLabelClass}>Team</p>
              <p className="truncate text-sm font-semibold text-highlighted">
                {selectedTeamName || "No team selected"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Collapse team panel"
              onClick={() => onCompactChange(true)}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </header>

          <div className="flex w-full flex-1 flex-col gap-4 overflow-y-auto p-4">
            {selectedTeamName ? (
              <section className={dashboardSectionClass}>
                <div className={dashboardCardClass}>
                  <div className={dashboardCardHeaderClass}>
                    <div className={dashboardCardIconClass}>
                      <Users className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-highlighted">
                        {selectedTeamName}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {roleLabel ? <Badge variant="secondary">{roleLabel}</Badge> : null}
                        <span className="text-xs text-muted">
                          {memberCount} {memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {canInvite
                      ? "Manage members, roles, and who can access shared nodes."
                      : "View team details. Owner role is required to manage members."}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={onOpenTeamSettings}
                  >
                    <Settings2 className="size-4" />
                    Team settings
                  </Button>
                </div>
              </section>
            ) : null}

            <section className={dashboardSectionClass}>
              <div className={dashboardCardClass}>
                <p className={dashboardLabelClass}>Create team</p>
                {createTeamOpen ? (
                  <Form {...createTeamForm}>
                    <form
                      className="mt-3 space-y-2"
                      onSubmit={createTeamForm.handleSubmit(async (values) => {
                        await onCreateTeam(values.name);
                        createTeamForm.reset();
                        setCreateTeamOpen(false);
                      })}
                    >
                      <FormField
                        control={createTeamForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">Team name</FormLabel>
                            <FormControl>
                              <Input placeholder="Team name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 pt-2">
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
                            setCreateTeamOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setCreateTeamOpen(true)}
                  >
                    <Plus className="size-4" />
                    New team
                  </Button>
                )}
                <p className="mt-2 text-xs text-muted">{teamsCount} teams available</p>
              </div>
            </section>

            <section className={dashboardSectionClass}>
              <div className={dashboardCardClass}>
                <p className={dashboardLabelClass}>Node sharing</p>
                <p className="mt-2 text-sm font-semibold text-highlighted">
                  {nodeShareStatus.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{nodeShareStatus.hint}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className={cn("mt-3 w-full", shellFocusRingClass)}
                  disabled={nodeShareActionDisabled}
                  onClick={onToggleSelectedNodeSharing}
                >
                  {isNodeShareActionPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {nodeShareActionLabel}
                </Button>
              </div>
            </section>
          </div>
        </>
      )}
    </aside>
  );
}
