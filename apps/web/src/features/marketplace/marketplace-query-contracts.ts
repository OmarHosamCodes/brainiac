export type MarketplaceKind = "all" | "node" | "tab" | "block";

export function buildMarketplaceQueryInput(args: {
  cursor: string | null;
  limit: number;
  kind: MarketplaceKind;
  search?: string;
}) {
  return {
    cursor: args.cursor ?? undefined,
    limit: args.limit,
    kind: args.kind,
    search: args.search,
  };
}
