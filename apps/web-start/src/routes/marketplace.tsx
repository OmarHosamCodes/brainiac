import type { WorkspaceMarketplaceItem } from "@brainiac/workspace";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search, Store } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";
import { AppLayout } from "@/layouts/app-layout";
import { orpc } from "@/lib/orpc";
import { requireAuthenticatedRoute } from "@/lib/auth-guard";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  cloneMarketplaceBlockPayload,
  cloneMarketplaceNodePayloadAsNode,
  cloneMarketplaceTabPayload,
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "@/utils/workspace-marketplace";

const MARKETPLACE_PAGE_SIZE = 20;
const filterKinds = ["all", "node", "tab", "block"] as const;

export const Route = createFileRoute("/marketplace")({
  beforeLoad: requireAuthenticatedRoute,
  component: MarketplaceRoute,
});

function MarketplaceRoute() {
  return (
    <AppLayout>
      <MarketplaceSurface />
    </AppLayout>
  );
}

function MarketplaceSurface() {
  useAppShellPageTitle("Marketplace");

  const workspaceState = useWorkspaceState();
  const [kind, setKind] = React.useState<(typeof filterKinds)[number]>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useInfiniteQuery({
    ...orpc.workspace.marketplace.list.infiniteOptions({
      input: (pageParam: string | null) => ({
        cursor: pageParam ?? undefined,
        limit: MARKETPLACE_PAGE_SIZE,
        kind,
        search: debouncedSearch || undefined,
      }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: { nextCursor: string | null }) => lastPage.nextCursor,
    }),
    staleTime: 15_000,
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  function importItem(item: WorkspaceMarketplaceItem) {
    const payload = item.payload;

    if (payload.kind === "node") {
      const node = cloneMarketplaceNodePayloadAsNode(payload);
      workspaceState.updateNodes((nodes) => {
        nodes.push(node);
      });
      useWorkspaceStore.setState({ selectedNodeIds: [node.id] });
      toast({ title: "Imported node" });
      return;
    }

    const targetNodeId =
      useWorkspaceStore.getState().selectedNodeIds[0] ?? workspaceState.nodes[0]?.id ?? null;

    if (!targetNodeId) {
      toast({
        title: "No target node",
        description: "Create or select a node before importing tabs or blocks.",
        variant: "destructive",
      });
      return;
    }

    workspaceState.updateNodes((nodes) => {
      const node = nodes.find((entry) => entry.id === targetNodeId);
      if (!node) return;

      if (payload.kind === "tab") {
        const cloned = cloneMarketplaceTabPayload(payload);
        if (!cloned) return;
        node.customBlockTemplates.push(...cloned.templates);
        node.tabs.push(cloned.tab);
        node.viewState.activeTabId = cloned.tab.id;
        return;
      }

      const cloned = cloneMarketplaceBlockPayload(payload);
      if (!cloned) return;
      node.customBlockTemplates.push(...cloned.templates);
      const tab = node.tabs.find((entry) => entry.id === node.viewState.activeTabId) ?? node.tabs[0];
      tab?.blocks.unshift(cloned.block);
    });
    toast({ title: `Imported ${getMarketplacePayloadTypeLabel(payload).toLowerCase()}` });
  }

  return (
    <section className="flex h-full flex-col overflow-y-auto p-4 md:p-6">
      <header className="border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <Store className="size-4" />
              Team Marketplace
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-normal">Shared workspace parts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Import nodes, tabs, and blocks into the current workspace.
            </p>
          </div>
          <Badge className={workspaceState.saveBadge.className}>{workspaceState.saveBadge.label}</Badge>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {filterKinds.map((entry) => (
              <Button
                key={entry}
                type="button"
                size="sm"
                variant={kind === entry ? "default" : "outline"}
                onClick={() => setKind(entry)}
              >
                {entry === "all" ? "All" : entry.charAt(0).toUpperCase() + entry.slice(1)}
              </Button>
            ))}
          </div>
          <label className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              placeholder="Search marketplace"
            />
          </label>
        </div>
      </header>

      {query.isLoading ? (
        <div className="grid gap-4 py-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed bg-muted/20 p-10 text-center">
          <p className="text-sm font-bold">No items found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try another filter or search term.</p>
        </div>
      ) : (
        <div className="grid gap-4 py-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-3xl border bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">{getMarketplacePayloadTypeLabel(item.payload)}</Badge>
                  <h2 className="mt-3 text-base font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.summary || getMarketplacePayloadSummary(item.payload)}
                  </p>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => importItem(item)} aria-label="Import item">
                  <Download className="size-4" />
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Shared by {item.createdByName || "Unknown"}
              </p>
            </article>
          ))}
        </div>
      )}

      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="mx-auto mb-8"
        >
          {query.isFetchingNextPage ? "Loading" : "Load more"}
        </Button>
      ) : null}
    </section>
  );
}
