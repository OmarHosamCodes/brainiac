import type { WorkspaceMarketplaceItem } from "@brainiac/workspace";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import {
  buildMarketplaceQueryInput,
  type MarketplaceKind,
} from "@/features/marketplace/marketplace-query-contracts";

const MARKETPLACE_PAGE_SIZE = 20;

export function useMarketplaceQuery(kind: MarketplaceKind, search: string | undefined) {
  const session = authClient.useSession();
  const marketplaceQuery = useInfiniteQuery({
    ...orpc.workspace.marketplace.list.infiniteOptions({
      input: (pageParam: string | null) =>
        buildMarketplaceQueryInput({
          cursor: pageParam,
          limit: MARKETPLACE_PAGE_SIZE,
          kind,
          search,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    enabled: Boolean(session.data?.user),
    staleTime: 15_000,
  } as unknown as Parameters<typeof useInfiniteQuery>[0]);

  const pages = (
    marketplaceQuery.data as { pages: Array<{ items: WorkspaceMarketplaceItem[] }> } | undefined
  )?.pages;
  const allItems = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);

  return { marketplaceQuery, allItems };
}
