import type { WorkspaceBlock } from "@brainiac/workspace";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppShellActions, useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useWorkspaceSnapshot } from "@/hooks/use-workspace";
import { workspaceBlockRegistry } from "@/utils/workspace-block-registry";

export function NodeDetailSurface(props: { id: string }) {
  const workspaceQuery = useWorkspaceSnapshot();
  const node = workspaceQuery.data?.nodes.find((item) => item.id === props.id) ?? null;

  useAppShellPageTitle(node?.title ?? "Node");
  const shellActions = React.useMemo(
    () => (
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </Button>
    ),
    [],
  );
  useAppShellActions(shellActions);

  if (workspaceQuery.isLoading) {
    return (
      <div className="grid gap-4 p-4 md:p-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!node) {
    return (
      <section className="p-4 md:p-6">
        <div className="rounded-[2rem] border bg-card p-8">
          <h2 className="text-xl font-bold">Node not found</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The node may have been deleted or may not belong to this workspace.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 md:p-6">
      <div className="max-w-5xl">
        <header className="border-b pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{node.nodeType}</Badge>
            <Badge variant="muted">{node.visibility}</Badge>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-normal">{node.title}</h2>
          {node.content ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{node.content}</p>
          ) : null}
        </header>

        <div className="mt-6 grid gap-4">
          {node.tabs.flatMap((tab) =>
            tab.blocks.map((block) => <BlockPreview key={block.id} block={block} tabTitle={tab.title} />),
          )}
        </div>
      </div>
    </section>
  );
}

function BlockPreview(props: { block: WorkspaceBlock; tabTitle: string }) {
  const registryEntry = workspaceBlockRegistry[props.block.type];

  return (
    <article className="rounded-[2rem] border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {props.tabTitle}
          </p>
          <h3 className="mt-1 text-base font-bold">{registryEntry?.label ?? props.block.type}</h3>
        </div>
        <ExternalLink className="size-4 text-muted-foreground" />
      </div>
      <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-muted p-4 font-mono text-xs leading-6 text-muted-foreground">
        {JSON.stringify(props.block, null, 2)}
      </pre>
    </article>
  );
}
