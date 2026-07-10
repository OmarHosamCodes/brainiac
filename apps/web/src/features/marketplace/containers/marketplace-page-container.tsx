import { MarketplacePageSurface } from "../views/marketplace-page-surface";
import { useMarketplacePage } from "../hooks/use-marketplace-page";

export function MarketplacePage() {
  const page = useMarketplacePage();
  return <MarketplacePageSurface {...page} />;
}
