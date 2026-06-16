import type { OpenRouterCatalogModel } from "@brainiac/agent";
import { Search, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardLabelClass } from "@/lib/utils/dashboard-ui";
import { cn } from "@/lib/utils";

type DashboardAgentModelLibraryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelSearch: string;
  onModelSearchChange: (value: string) => void;
  filteredModelOptions: Array<
    OpenRouterCatalogModel & {
      label: string;
      pricingLabel: string;
      compactPricingLabel: string;
    }
  >;
  selectedModelId?: string;
  onSelectModel: (modelId: string) => void;
  onToggleFavorite: (modelId: string) => void;
  isFavoriteModel: (modelId: string) => boolean;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
};

export function DashboardAgentModelLibrary({
  open,
  onOpenChange,
  modelSearch,
  onModelSearchChange,
  filteredModelOptions,
  selectedModelId,
  onSelectModel,
  onToggleFavorite,
  isFavoriteModel,
  favoritesOnly,
  onFavoritesOnlyChange,
}: DashboardAgentModelLibraryProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-0 z-20 border-b border-default bg-background/95 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={dashboardLabelClass}>Model library</p>
          <p className="text-sm text-muted">Browse OpenRouter models for this conversation.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={modelSearch}
            placeholder="Search models"
            className="pl-9"
            onChange={(event) => onModelSearchChange(event.target.value)}
          />
        </div>
        <Button
          variant={favoritesOnly ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
        >
          <Star className="size-4" />
          Favorites
        </Button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {filteredModelOptions.map((model) => (
          <button
            key={model.id}
            type="button"
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
              selectedModelId === model.id
                ? "border-primary/40 bg-primary/10"
                : "border-muted/60 hover:border-primary/30 hover:bg-muted/20",
            )}
            onClick={() => onSelectModel(model.id)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-highlighted">{model.name}</span>
                {model.isFree ? <Badge variant="secondary">Free</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted">{model.creatorLabel}</p>
              <p className="mt-1 text-xs text-muted">{model.pricingLabel}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(model.id);
              }}
            >
              <Star className={cn("size-4", isFavoriteModel(model.id) && "fill-current text-warning")} />
            </Button>
          </button>
        ))}
      </div>
    </div>
  );
}
