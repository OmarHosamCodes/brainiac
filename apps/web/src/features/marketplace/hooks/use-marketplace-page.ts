import type { WorkspaceMarketplaceItem } from "@orch/workspace";
import { useEffect, useRef, useState } from "react";

import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { useMarketplaceQuery } from "@/features/marketplace/hooks/use-marketplace-query";
import { useWorkspaceQuery } from "@/features/workspace/hooks/use-workspace-query";

export const marketplaceFilterTabs = [
  { label: "All", kind: "all" as const },
  { label: "Nodes", kind: "node" as const },
  { label: "Tabs", kind: "tab" as const },
  { label: "Blocks", kind: "block" as const },
];

export function useMarketplacePage() {
  const workspace = useWorkspaceQuery();
  const [activeKind, setActiveKind] =
    useState<(typeof marketplaceFilterTabs)[number]["kind"]>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importItem, setImportItem] = useState<WorkspaceMarketplaceItem | null>(null);
  const [gridGeneration, setGridGeneration] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstFilterEffect = useRef(true);

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

  const { marketplaceQuery, allItems } = useMarketplaceQuery(
    activeKind,
    debouncedSearch.trim() || undefined,
  );
  const isInitialLoading = marketplaceQuery.isLoading && !marketplaceQuery.isFetchingNextPage;
  const { isBooting } = useShellBootGate(!isInitialLoading);

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

  return {
    ...workspace,
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
    activeTabLabel: marketplaceFilterTabs.find((tab) => tab.kind === activeKind)?.label ?? "All",
    openImportModal: (item: WorkspaceMarketplaceItem) => {
      setImportItem(item);
      setImportModalOpen(true);
    },
    onImported: (payload: { kind: string; nodeId?: string }) => {
      if (payload.nodeId) workspace.setSelectedNodeIds([payload.nodeId]);
    },
  };
}

export type MarketplacePageModel = ReturnType<typeof useMarketplacePage>;
