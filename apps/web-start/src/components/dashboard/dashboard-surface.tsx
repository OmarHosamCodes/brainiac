import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppShellActions, useAppShellCustomDock, useAppShellDockContent, useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useTeamSelection } from "@/hooks/use-team-selection";
import { useWorkspaceSnapshot } from "@/hooks/use-workspace";

export function DashboardSurface() {
  useAppShellPageTitle("Dashboard");
  useAppShellCustomDock();

  const workspaceQuery = useWorkspaceSnapshot();
  const teamSelection = useTeamSelection();
  const nodes = workspaceQuery.data?.nodes ?? [];

  const shellActions = React.useMemo(
    () => (
    <Button type="button" size="sm">
      <Plus className="size-4" />
      Add
    </Button>
    ),
    [],
  );
  const dockContent = React.useMemo(
    () => (
    <div className="flex h-full flex-col p-5">
      <h2 className="text-sm font-bold">Workspace agent</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The full agent chat port will attach here. Current workspace nodes available: {nodes.length}.
      </p>
    </div>
    ),
    [nodes.length],
  );
  useAppShellActions(shellActions);
  useAppShellDockContent(dockContent);

  return (
    <section className="min-h-full bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Canvas</p>
          <h2 className="text-xl font-bold">Workspace map</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{teamSelection.selectedTeam?.name ?? "Team"}</Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => void workspaceQuery.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {workspaceQuery.isLoading ? (
        <div className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="relative min-h-[calc(100vh-9rem)] overflow-hidden p-4 md:p-6">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,oklch(0.55_0.005_285/0.22)_1px,transparent_0)] [background-size:24px_24px]" />
          <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nodes.length > 0 ? (
              nodes.map((node) => (
                <Link
                  key={node.id}
                  to="/node/$id"
                  params={{ id: node.id }}
                  className="rounded-[2rem] border bg-card p-5 text-card-foreground transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate text-base font-bold">{node.title}</h3>
                    <Badge variant="muted">{node.nodeType}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {node.content || "No description yet."}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[2rem] border bg-card p-8">
                <h3 className="text-lg font-bold">No nodes yet</h3>
                <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
                  The React canvas shell is connected to the workspace query. Node creation and infinite canvas interactions are the next dashboard parity layer.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
