import type { AgentModelTier } from "@orch/agent/types";

import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { cn } from "@/lib/utils";

type WorkspaceAgentModelPresetMenuViewProps = {
  tier: AgentModelTier;
  auto: boolean;
  free: boolean;
  resolvedModelLabel: string | null;
  onTierChange: (tier: AgentModelTier) => void;
  onAutoChange: (auto: boolean) => void;
  onFreeChange: (free: boolean) => void;
  onBrowseAll: () => void;
};

function ToggleChip({
  pressed,
  label,
  onPressedChange,
}: {
  pressed: boolean;
  label: string;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 flex-1 items-center justify-center rounded-full border px-3 text-sm font-medium motion-safe:transition-colors motion-safe:duration-150",
        pressed
          ? "border-border bg-secondary text-secondary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={() => onPressedChange(!pressed)}
    >
      {label}
    </button>
  );
}

export function WorkspaceAgentModelPresetMenuView({
  tier,
  auto,
  free,
  resolvedModelLabel,
  onTierChange,
  onAutoChange,
  onFreeChange,
  onBrowseAll,
}: WorkspaceAgentModelPresetMenuViewProps) {
  return (
    <div className="flex flex-col gap-3" data-workspace-agent-overlay>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Model</p>
        <p className="text-xs text-muted-foreground">
          Pick a quality band. Auto chooses the best fit for each message.
        </p>
      </div>

      <Tabs
        value={tier}
        onValueChange={(value) => onTierChange(value as AgentModelTier)}
        className="gap-2"
      >
        <TabsList className="grid h-9 w-full grid-cols-3 rounded-full bg-muted p-1">
          <TabsTrigger value="fast" className="rounded-full text-xs">
            Fast
          </TabsTrigger>
          <TabsTrigger value="balanced" className="rounded-full text-xs">
            Balanced
          </TabsTrigger>
          <TabsTrigger value="pro" className="rounded-full text-xs">
            Pro
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <ToggleChip pressed={auto} label="Auto" onPressedChange={onAutoChange} />
        <ToggleChip pressed={free} label="Free" onPressedChange={onFreeChange} />
      </div>

      {resolvedModelLabel ? (
        <p className="font-mono text-xs text-muted-foreground">Last used · {resolvedModelLabel}</p>
      ) : null}

      <Separator />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start px-2 text-muted-foreground hover:text-foreground"
        onClick={onBrowseAll}
      >
        Browse all models
      </Button>
    </div>
  );
}
