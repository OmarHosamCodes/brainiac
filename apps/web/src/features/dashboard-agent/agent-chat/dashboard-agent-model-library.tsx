import type { OpenRouterCatalogModel } from "@brainiac/agent";
import { Search, Star } from "lucide-react";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { agentChatLabelClass } from "@/features/dashboard-agent/dashboard-agent-ui";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(80vh,640px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-default px-4 py-4 text-left">
          <p className={agentChatLabelClass}>Model library</p>
          <DialogTitle className="text-base">Choose a model</DialogTitle>
          <DialogDescription>Browse OpenRouter models for this conversation.</DialogDescription>
        </DialogHeader>

        <div className="border-b border-default px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
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
              aria-pressed={favoritesOnly}
              onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
            >
              <Star className="size-4" />
              Favorites
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {filteredModelOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No models match your filters.</p>
          ) : (
            filteredModelOptions.map((model) => (
              <button
                key={model.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                  selectedModelId === model.id
                    ? "border-primary/40 bg-primary/10"
                    : "border-default hover:border-primary/30 hover:bg-muted/20",
                )}
                onClick={() => {
                  onSelectModel(model.id);
                  onOpenChange(false);
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-highlighted">
                      {model.name}
                    </span>
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
                  aria-label={
                    isFavoriteModel(model.id) ? "Remove from favorites" : "Add to favorites"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(model.id);
                  }}
                >
                  <Star
                    className={cn(
                      "size-4",
                      isFavoriteModel(model.id) && "fill-current text-warning",
                    )}
                  />
                </Button>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
