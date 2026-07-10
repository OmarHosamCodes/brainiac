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
import type { CSSProperties } from "react";

import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { MarketplaceImportModal } from "@/features/marketplace/components/marketplace-import-modal";
import { MarketplaceItemCard } from "@/features/marketplace/components/marketplace-item-card";
import { MarketplaceSubtitleBreadcrumb } from "@/features/marketplace/components/marketplace-subtitle-breadcrumb";
import type { MarketplacePageModel } from "@/features/marketplace/hooks/use-marketplace-page";
import {
  AppShellTopbarActions,
  AppShellTopbarSubtitle,
} from "@/features/app-shell/app-shell-topbar";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import {
  shellContentInClass,
  shellPageBodyClass,
  shellPageClass,
  shellPageIntroClass,
  shellStaggerItemClass,
  shellTopbarFieldClass,
} from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

export type MarketplacePageSurfaceProps = MarketplacePageModel;

export function MarketplacePageSurface({
  isWorkspaceInitialLoading,
  isWorkspaceRefreshing,
  nodes,
  selectedNodeIds,
  saveBadge,
  saveError,
  workspaceQuery,
  activeKind,
  setActiveKind,
  searchInput,
  setSearchInput,
  importModalOpen,
  setImportModalOpen,
  importItem,
  gridGeneration,
  sentinelRef,
  allItems,
  marketplaceQuery,
  isInitialLoading,
  isBooting,
  activeTabLabel,
  openImportModal,
  onImported,
}: MarketplacePageSurfaceProps) {
  const totalLoaded = allItems.length;
  const filterTabs = [
    { label: "All", kind: "all" as const, icon: Layers },
    { label: "Nodes", kind: "node" as const, icon: Box },
    { label: "Tabs", kind: "tab" as const, icon: Layout },
    { label: "Blocks", kind: "block" as const, icon: Component },
  ];

  return (
    <AppShellPage subtitle={activeTabLabel} slots={["subtitle", "actions"]}>
      <div className="flex h-full flex-col overflow-y-auto bg-default">
        {!isBooting ? (
          <>
            <AppShellTopbarSubtitle>
              <MarketplaceSubtitleBreadcrumb
                tabs={filterTabs}
                activeKind={activeKind}
                onKindChange={(value) =>
                  setActiveKind(value as (typeof filterTabs)[number]["kind"])
                }
              />
            </AppShellTopbarSubtitle>

            <AppShellTopbarActions>
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
            </AppShellTopbarActions>

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

                {isInitialLoading ? null : !isInitialLoading &&
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
                              ? ({ "--stagger-i": index } as CSSProperties)
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
          </>
        ) : (
          <LogoLoader label="Loading marketplace" />
        )}
      </div>
    </AppShellPage>
  );
}
