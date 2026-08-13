import type {
  AgentModelTier,
  AgentScopeRef,
  AgentToolCatalogEntry,
  DashboardAgentToolPreset,
} from "@orch/agent/types";
import {
  Clock,
  Crosshair,
  FileText,
  LayoutGrid,
  ListTodo,
  MessageCircleQuestion,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ComposerPrimitive } from "@assistant-ui/react";

import { ThreadComposer } from "@/components/assistant-ui/thread";
import {
  ComposerAttachButton,
  ComposerMenu,
  ComposerMenuItem,
} from "@/components/elements/composer";
import { WorkspaceAgentScopeChipView } from "@/features/workspace-agent/scope-chip-view";
import { WorkspaceAgentThreadModelSelector } from "@/features/workspace-agent/workspace-agent-thread-model-selector";
import { WorkspaceAgentToolMenuView } from "@/features/workspace-agent/tool-menu-view";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

const MODE_OPTIONS: Array<{
  preset: DashboardAgentToolPreset;
  label: string;
  helper: string;
}> = [
  { preset: "ask", label: "Ask", helper: "Answers only. No writes" },
  { preset: "plan", label: "Plan", helper: "Draft a plan to confirm" },
  { preset: "agent", label: "Agent", helper: "Propose changes to approve" },
];

function modeIcon(preset: DashboardAgentToolPreset) {
  switch (preset) {
    case "ask":
      return MessageCircleQuestion;
    case "plan":
      return ListTodo;
    case "agent":
      return Wrench;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function modeLabel(preset: DashboardAgentToolPreset) {
  switch (preset) {
    case "ask":
      return "Ask";
    case "plan":
      return "Plan";
    case "agent":
      return "Agent";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function ComposerPillTag({
  icon: Icon,
  label,
  activateLabel,
  dismissLabel,
  tooltip,
  onActivate,
  onDismiss,
}: {
  icon: typeof Wrench;
  label: string;
  activateLabel: string;
  dismissLabel: string;
  tooltip: string;
  onActivate: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      key={`pill-${label}`}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
      transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
      className="inline-flex h-7 items-center gap-0.5 rounded-full border border-border bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground"
            aria-label={activateLabel}
            onClick={onActivate}
          >
            <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-full p-0.5 text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
            aria-label={dismissLabel}
            onClick={onDismiss}
          >
            <X className="size-3" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{dismissLabel}</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export type WorkspaceAgentThreadComposerViewProps = {
  placeholder: string;
  scopeChips: AgentScopeRef[];
  onRemoveChip: (id: string) => void;
  selectedToolPreset: DashboardAgentToolPreset;
  onSelectToolPreset: (preset: DashboardAgentToolPreset) => void;
  planModeEnabled: boolean;
  crossSurfaceUnlockLabel: "Agency" | "Canvas" | null;
  onUnlockCrossSurface: () => void;
  selectedModelLabel: string;
  selectedModelButtonLabel: string;
  resolvedModelLabel: string | null;
  modelTier: AgentModelTier;
  modelAuto: boolean;
  modelFree: boolean;
  onModelTierChange: (tier: AgentModelTier) => void;
  onModelAutoChange: (auto: boolean) => void;
  onModelFreeChange: (free: boolean) => void;
  modelMenuOpen: boolean;
  onModelMenuOpenChange: (open: boolean) => void;
  onOpenModelLibrary: () => void;
  scopeModeActive: boolean;
  onToggleScopeMode: () => void;
  scopeHintSeen: boolean;
  toolsMenuOpen: boolean;
  onToolsMenuOpenChange: (open: boolean) => void;
  tools: AgentToolCatalogEntry[];
  toolsLoading: boolean;
};

export function WorkspaceAgentThreadComposerView({
  placeholder,
  scopeChips,
  onRemoveChip,
  selectedToolPreset,
  onSelectToolPreset,
  planModeEnabled,
  crossSurfaceUnlockLabel,
  onUnlockCrossSurface,
  selectedModelLabel,
  selectedModelButtonLabel,
  resolvedModelLabel,
  modelTier,
  modelAuto,
  modelFree,
  onModelTierChange,
  onModelAutoChange,
  onModelFreeChange,
  modelMenuOpen,
  onModelMenuOpenChange,
  onOpenModelLibrary,
  scopeModeActive,
  onToggleScopeMode,
  scopeHintSeen,
  toolsMenuOpen,
  onToolsMenuOpenChange,
  tools,
  toolsLoading,
}: WorkspaceAgentThreadComposerViewProps) {
  const entityChips = scopeChips.filter((chip) => chip.kind !== "surface");
  const surfaceUnlockChip = scopeChips.find((chip) => chip.kind === "surface") ?? null;
  const selectedModeLabel = modeLabel(selectedToolPreset);
  const visibleModeOptions = MODE_OPTIONS.filter(
    (mode) => mode.preset !== "plan" || planModeEnabled,
  );
  const UnlockSurfaceIcon = crossSurfaceUnlockLabel === "Agency" ? Clock : LayoutGrid;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {!scopeHintSeen && scopeModeActive ? (
            <motion.p
              key="scope-hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="px-1 text-xs text-foreground/70"
            >
              Sniper on. Click anything to add it to scope.
            </motion.p>
          ) : null}
        </AnimatePresence>

        <ThreadComposer
          placeholder={placeholder}
          header={<WorkspaceAgentScopeChipView chips={entityChips} onRemove={onRemoveChip} />}
          leading={
            <>
              <Popover open={toolsMenuOpen} onOpenChange={onToolsMenuOpenChange}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <ComposerAttachButton aria-label="Modes, context, and tools" />
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Modes, context, and tools</TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-auto border-0 bg-transparent p-0 shadow-none"
                  data-workspace-agent-overlay
                >
                  <ComposerMenu open className="relative inset-auto mb-0 w-72">
                    <ComposerPrimitive.AddAttachment asChild>
                      <ComposerMenuItem onClick={() => onToolsMenuOpenChange(false)}>
                        <FileText className="text-foreground/35 size-3.5 shrink-0" aria-hidden />
                        Attach file
                      </ComposerMenuItem>
                    </ComposerPrimitive.AddAttachment>
                    {crossSurfaceUnlockLabel ? (
                      <ComposerMenuItem
                        onClick={() => {
                          onUnlockCrossSurface();
                          onToolsMenuOpenChange(false);
                        }}
                      >
                        <UnlockSurfaceIcon
                          className="text-foreground/35 size-3.5 shrink-0"
                          aria-hidden
                        />
                        Include {crossSurfaceUnlockLabel} tools
                      </ComposerMenuItem>
                    ) : null}
                    <ComposerMenuItem
                      active={scopeModeActive}
                      aria-pressed={scopeModeActive}
                      onClick={() => {
                        onToggleScopeMode();
                        onToolsMenuOpenChange(false);
                      }}
                    >
                      <Crosshair className="text-foreground/35 size-3.5 shrink-0" aria-hidden />
                      {scopeModeActive ? "Exit sniper mode" : "Sniper mode"}
                    </ComposerMenuItem>

                    <Separator className="my-1" />

                    {visibleModeOptions.map((mode) => {
                      const selected = selectedToolPreset === mode.preset;
                      const ModeIcon = modeIcon(mode.preset);
                      return (
                        <ComposerMenuItem
                          key={mode.preset}
                          active={selected}
                          onClick={() => {
                            onSelectToolPreset(mode.preset);
                            onToolsMenuOpenChange(false);
                          }}
                        >
                          <ModeIcon className="text-foreground/35 size-3.5 shrink-0" aria-hidden />
                          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                            <span>{mode.label}</span>
                            <span className="text-foreground/45 text-xs font-normal">
                              {mode.helper}
                            </span>
                          </span>
                        </ComposerMenuItem>
                      );
                    })}

                    <Separator className="my-1" />

                    <WorkspaceAgentToolMenuView tools={tools} loading={toolsLoading} />
                  </ComposerMenu>
                </PopoverContent>
              </Popover>

              <AnimatePresence initial={false}>
                {selectedToolPreset !== "agent" ? (
                  <ComposerPillTag
                    icon={modeIcon(selectedToolPreset)}
                    label={selectedModeLabel}
                    activateLabel={`Mode: ${selectedModeLabel}. Change mode`}
                    dismissLabel={`Remove ${selectedModeLabel} mode and return to Agent`}
                    tooltip={`${selectedModeLabel} mode. Click to change`}
                    onActivate={() => onToolsMenuOpenChange(true)}
                    onDismiss={() => onSelectToolPreset("agent")}
                  />
                ) : null}
                {scopeModeActive ? (
                  <ComposerPillTag
                    icon={Crosshair}
                    label="Scope"
                    activateLabel="Scope mode active. Open tools menu"
                    dismissLabel="Exit scope mode"
                    tooltip="Click page items to add them to scope"
                    onActivate={() => onToolsMenuOpenChange(true)}
                    onDismiss={onToggleScopeMode}
                  />
                ) : null}
                {surfaceUnlockChip ? (
                  <ComposerPillTag
                    icon={surfaceUnlockChip.id === "agency" ? Clock : LayoutGrid}
                    label={surfaceUnlockChip.label}
                    activateLabel={`${surfaceUnlockChip.label} tools included. Open tools menu`}
                    dismissLabel={`Stop including ${surfaceUnlockChip.label} tools`}
                    tooltip={`${surfaceUnlockChip.label} tools are included in this chat`}
                    onActivate={() => onToolsMenuOpenChange(true)}
                    onDismiss={() => onRemoveChip(surfaceUnlockChip.id)}
                  />
                ) : null}
              </AnimatePresence>

              <WorkspaceAgentThreadModelSelector
                modelTier={modelTier}
                modelAuto={modelAuto}
                modelFree={modelFree}
                selectedModelLabel={selectedModelLabel}
                selectedModelButtonLabel={selectedModelButtonLabel}
                resolvedModelLabel={resolvedModelLabel}
                modelMenuOpen={modelMenuOpen}
                onModelTierChange={onModelTierChange}
                onModelAutoChange={onModelAutoChange}
                onModelFreeChange={onModelFreeChange}
                onModelMenuOpenChange={onModelMenuOpenChange}
                onOpenModelLibrary={onOpenModelLibrary}
              />
            </>
          }
        />
      </div>
    </TooltipProvider>
  );
}
