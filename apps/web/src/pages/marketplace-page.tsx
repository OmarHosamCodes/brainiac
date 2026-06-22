import type { WorkspaceMarketplaceItem } from "@brainiac/workspace";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Box,
  CloudOff,
  Component,
  Layers,
  Layout,
  Loader2,
  Search,
  SearchX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShellPage } from "@/components/app-shell-page";
import { MarketplaceImportModal } from "@/components/marketplace-import-modal";
import { MarketplaceItemCard } from "@/components/marketplace-item-card";
import { AppShellHeaderActions, AppShellHeaderContext } from "@/components/app-shell-header-slots";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { useWorkspaceQuery } from "@/stores/workspace";
import { orpc } from "@/lib/orpc";
import {
  shellContentInClass,
  shellPageBodyClass,
  shellPageClass,
  shellPageIntroClass,
  shellStaggerItemClass,
  shellTopbarFieldClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

const MARKETPLACE_PAGE_SIZE = 20;

const filterTabs = [
  { label: "All", kind: "all" as const, icon: Layers },
  { label: "Nodes", kind: "node" as const, icon: Box },
  { label: "Tabs", kind: "tab" as const, icon: Layout },
  { label: "Blocks", kind: "block" as const, icon: Component },
];

export function MarketplacePage() {
  const authSession = authClient.useSession();
  const workspace = useWorkspaceQuery();

  const {
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    nodes,
    selectedNodeIds,
    setSelectedNodeIds,
    saveBadge,
    saveError,
    workspaceQuery,
  } = workspace;

  const [activeKind, setActiveKind] = useState<(typeof filterTabs)[number]["kind"]>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importItem, setImportItem] = useState<WorkspaceMarketplaceItem | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstFilterEffect = useRef(true);
  const [gridGeneration, setGridGeneration] = useState(0);

  useEffect(() => {
    if (isFirstFilterEffect.current) {
      isFirstFilterEffect.current = false;
      return;
    }
    setGridGeneration((value) => value + 1);
  }, [activeKind, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const normalizedSearch = debouncedSearch.trim() || undefined;

  const marketplaceQuery = useInfiniteQuery({
    ...orpc.workspace.marketplace.list.infiniteOptions({
      input: (pageParam: string | null) => ({
        cursor: pageParam ?? undefined,
        limit: MARKETPLACE_PAGE_SIZE,
        kind: activeKind,
        search: normalizedSearch,
      }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    enabled: Boolean(authSession.data?.user),
    staleTime: 15_000,
  } as unknown as Parameters<typeof useInfiniteQuery>[0]);

  const marketplacePages = (
    marketplaceQuery.data as { pages: Array<{ items: WorkspaceMarketplaceItem[] }> } | undefined
  )?.pages;

  const allItems = useMemo(
    () => marketplacePages?.flatMap((page) => page.items) ?? [],
    [marketplacePages],
  );

  const totalLoaded = allItems.length;

  const isInitialLoading = marketplaceQuery.isLoading && !marketplaceQuery.isFetchingNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting &&
          marketplaceQuery.hasNextPage &&
          !marketplaceQuery.isFetchingNextPage
        ) {
          void marketplaceQuery.fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    marketplaceQuery.fetchNextPage,
    marketplaceQuery.hasNextPage,
    marketplaceQuery.isFetchingNextPage,
    allItems.length,
  ]);

  function openImportModal(item: WorkspaceMarketplaceItem) {
    setImportItem(item);
    setImportModalOpen(true);
  }

  function onImported(payload: { kind: string; nodeId?: string }) {
    if (payload.nodeId) {
      setSelectedNodeIds([payload.nodeId]);
    }
  }

  return (
    <AppShellPage title="Marketplace" slots={["context", "actions"]}>
      <div className="flex h-full flex-col overflow-y-auto bg-default">
        <AppShellHeaderContext>
          <div className="hidden md:block">
            <Tabs
              value={activeKind}
              onValueChange={(value) => setActiveKind(value as (typeof filterTabs)[number]["kind"])}
            >
              <TabsList>
                {filterTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.kind} value={tab.kind}>
                      <Icon className="size-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        </AppShellHeaderContext>

        <AppShellHeaderActions>
          <div className={cn("relative hidden w-36 lg:block xl:w-44", shellTopbarFieldClass)}>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={searchInput}
              placeholder="Search..."
              className="h-9 pl-8"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <Badge variant="secondary" className="hidden h-9 sm:inline-flex">
            {totalLoaded}
          </Badge>
          {isWorkspaceRefreshing ? (
            <Badge variant="default" className="inline-flex h-9 gap-1">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            </Badge>
          ) : null}
        </AppShellHeaderActions>

        <main className={shellPageClass}>
          <div className={shellPageBodyClass}>
            <p className={shellPageIntroClass}>
              Browse and import shared nodes, tabs, and blocks into your workspace.
              {saveBadge.label ? (
                <span
                  className={cn(
                    "ml-2 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase",
                    saveBadge.className,
                  )}
                >
                  {saveBadge.label}
                </span>
              ) : null}
            </p>

            <div className="flex flex-col gap-3 md:hidden">
              <Tabs
                value={activeKind}
                onValueChange={(value) =>
                  setActiveKind(value as (typeof filterTabs)[number]["kind"])
                }
              >
                <TabsList className="w-full">
                  {filterTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger key={tab.kind} value={tab.kind}>
                        <Icon className="size-3.5" />
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={searchInput}
                  placeholder="Search marketplace..."
                  className="h-9 pl-8"
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
            </div>

            {workspaceQuery.status === "error" ? (
              <div
                className={cn(
                  "flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4",
                  shellContentInClass,
                )}
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-highlighted">Workspace unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workspaceQuery.error?.message || "The user workspace could not be loaded."}
                  </p>
                </div>
              </div>
            ) : null}

            {saveError ? (
              <div
                className={cn(
                  "flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4",
                  shellContentInClass,
                )}
              >
                <CloudOff className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-highlighted">Unable to persist workspace</p>
                  <p className="mt-1 text-sm text-muted-foreground">{saveError}</p>
                </div>
              </div>
            ) : null}

            {isInitialLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-50 rounded-2xl" />
                ))}
              </div>
            ) : !isInitialLoading &&
              allItems.length === 0 &&
              !marketplaceQuery.isFetchingNextPage ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/40 py-20 text-center",
                  shellContentInClass,
                )}
              >
                <SearchX className="mb-4 size-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-highlighted">No items found</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  We couldn&apos;t find any marketplace items matching your current filters or
                  search query.
                </p>
              </div>
            ) : (
              <>
                <div
                  key={gridGeneration}
                  className={cn(
                    "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
                    gridGeneration > 0 && shellContentInClass,
                  )}
                >
                  {allItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(gridGeneration === 0 && index < 8 && shellStaggerItemClass)}
                      style={
                        gridGeneration === 0 && index < 8
                          ? ({ "--stagger-i": index } as React.CSSProperties)
                          : undefined
                      }
                    >
                      <MarketplaceItemCard
                        item={item}
                        loading={isWorkspaceInitialLoading}
                        onInsert={openImportModal}
                      />
                    </div>
                  ))}
                </div>

                <div ref={sentinelRef} className="flex items-center justify-center py-8">
                  {marketplaceQuery.isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading more items...
                    </div>
                  ) : !marketplaceQuery.hasNextPage && allItems.length > 0 ? (
                    <p className="text-xs tracking-wider text-muted-foreground/60 uppercase">
                      All items loaded
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </main>

        <MarketplaceImportModal
          open={importModalOpen}
          item={importItem}
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onOpenChange={setImportModalOpen}
          onImported={onImported}
        />
      </div>
    </AppShellPage>
  );
}
