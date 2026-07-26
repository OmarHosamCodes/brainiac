import type { AgentToolCatalogEntry, DashboardAgentToolPreset } from "@orch/agent";
import type { WorkspaceNode } from "@orch/workspace";
import {
  Box,
  Check,
  Crosshair,
  Loader2,
  MessageCircleQuestion,
  Plus,
  Send,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { WorkspaceAgentScopeChipView } from "@/features/workspace-agent/scope-chip-view";
import { WorkspaceAgentToolMenuView } from "@/features/workspace-agent/tool-menu-view";
import type { WorkspaceAgentScopeChip } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

type WorkspaceAgentComposerViewProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  placeholder: string;
  scopeChips: WorkspaceAgentScopeChip[];
  onRemoveChip: (id: string) => void;
  mentionSuggestions: WorkspaceNode[];
  onSelectMention: (node: WorkspaceNode) => void;
  selectedToolPreset: DashboardAgentToolPreset;
  onSelectToolPreset: (preset: DashboardAgentToolPreset) => void;
  agentModeDisabled: boolean;
  selectedModelLabel: string;
  onOpenModelLibrary: () => void;
  scopeModeActive: boolean;
  onToggleScopeMode: () => void;
  scopeHintSeen: boolean;
  toolsMenuOpen: boolean;
  onToolsMenuOpenChange: (open: boolean) => void;
  tools: AgentToolCatalogEntry[];
  toolsLoading: boolean;
  canSend: boolean;
  isPending: boolean;
  onSend: () => void;
  dimmed: boolean;
  /** Shared-element morph target when composer is the floating shell (no chat card). */
  shellLayoutId?: string;
  /** True when composer sits inside the chat card shell (no outer morph id). */
  nestedInShell?: boolean;
};

const MODE_OPTIONS: Array<{
  preset: DashboardAgentToolPreset;
  label: string;
}> = [
  { preset: "ask", label: "Ask" },
  { preset: "agent", label: "Agent" },
];

const LAYOUT_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function WorkspaceAgentComposerView({
  draft,
  onDraftChange,
  placeholder,
  scopeChips,
  onRemoveChip,
  mentionSuggestions,
  onSelectMention,
  selectedToolPreset,
  onSelectToolPreset,
  agentModeDisabled,
  selectedModelLabel,
  onOpenModelLibrary,
  scopeModeActive,
  onToggleScopeMode,
  scopeHintSeen,
  toolsMenuOpen,
  onToolsMenuOpenChange,
  tools,
  toolsLoading,
  canSend,
  isPending,
  onSend,
  dimmed,
  shellLayoutId,
  nestedInShell = false,
}: WorkspaceAgentComposerViewProps) {
  const showMentions = mentionSuggestions.length > 0;
  const hasChips = scopeChips.length > 0;
  const multiline = draft.includes("\n") || draft.length > 80;
  const selectedModeLabel = selectedToolPreset === "ask" ? "Ask" : "Agent";
  const pillSurface = !(hasChips || multiline);
  const borderRadius = pillSurface ? 9999 : 16;

  return (
    <TooltipProvider>
      <motion.div
        className="w-full"
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
      >
        <AnimatePresence initial={false}>
          {!scopeHintSeen && scopeModeActive ? (
            <motion.p
              key="scope-hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="mb-2 px-1 text-xs text-muted-foreground"
            >
              Click anything to add it to scope.
            </motion.p>
          ) : null}
        </AnimatePresence>

        <motion.div
          layout
          layoutId={shellLayoutId}
          transition={{ layout: { duration: 0.38, ease: LAYOUT_EASE } }}
          style={{ borderRadius }}
          className={cn(
            "border border-border bg-card text-card-foreground",
            dimmed && "ring-1 ring-foreground/20",
            nestedInShell && "bg-background",
          )}
        >
          <WorkspaceAgentScopeChipView chips={scopeChips} onRemove={onRemoveChip} />

          <div
            className={cn(
              "relative flex gap-1 px-1.5",
              multiline || hasChips ? "items-end py-1.5" : "h-11 items-center py-0",
              hasChips && "pt-1",
            )}
          >
            <div className="flex shrink-0 items-center gap-1">
              <Popover open={toolsMenuOpen} onOpenChange={onToolsMenuOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-foreground"
                    aria-label="Modes, context, and tools"
                  >
                    <Plus />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  data-workspace-agent-overlay
                  className="w-72 gap-0 p-0"
                >
                  <div className="flex flex-col gap-0.5 p-1">
                    {MODE_OPTIONS.map((mode) => {
                      const disabled = mode.preset === "agent" && agentModeDisabled;
                      const selected = selectedToolPreset === mode.preset;
                      const ModeIcon = mode.preset === "ask" ? MessageCircleQuestion : Wrench;

                      const item = (
                        <button
                          key={mode.preset}
                          type="button"
                          disabled={disabled}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                            "motion-safe:transition-colors motion-safe:duration-150",
                            selected
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent hover:text-accent-foreground",
                            disabled &&
                              "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent hover:text-muted-foreground",
                          )}
                          onClick={() => {
                            if (disabled) return;
                            onSelectToolPreset(mode.preset);
                            onToolsMenuOpenChange(false);
                          }}
                        >
                          <ModeIcon className="size-4 text-muted-foreground" aria-hidden />
                          <span className="flex-1">{mode.label}</span>
                          {selected ? (
                            <Check className="size-4 text-foreground" aria-hidden />
                          ) : null}
                        </button>
                      );

                      if (!disabled) return item;

                      return (
                        <Tooltip key={mode.preset}>
                          <TooltipTrigger asChild>{item}</TooltipTrigger>
                          <TooltipContent>Agent edits are canvas-only for now</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-1 py-1">
                    <p className="px-3 pt-1 text-xs font-semibold text-muted-foreground">Tools</p>
                    <WorkspaceAgentToolMenuView tools={tools} loading={toolsLoading} />
                  </div>

                  <Separator />

                  <div className="p-1">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground motion-safe:transition-colors motion-safe:duration-150"
                      onClick={() => {
                        onToolsMenuOpenChange(false);
                        onOpenModelLibrary();
                      }}
                    >
                      <Box className="size-4 text-muted-foreground" aria-hidden />
                      Models
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <AnimatePresence initial={false}>
                {selectedToolPreset !== "agent" ? (
                  <motion.div
                    key={`mode-tag-${selectedModeLabel}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
                    className={cn(
                      "inline-flex h-6 items-center gap-0.5 rounded-full border border-border bg-secondary",
                      "pl-2 text-xs font-medium text-secondary-foreground",
                      agentModeDisabled ? "pr-2" : "pr-1",
                    )}
                  >
                    <button
                      type="button"
                      className="motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground"
                      aria-label={`Mode: ${selectedModeLabel}. Change mode`}
                      onClick={() => onToolsMenuOpenChange(true)}
                    >
                      {selectedModeLabel}
                    </button>
                    {!agentModeDisabled ? (
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
                        aria-label={`Remove ${selectedModeLabel} mode and return to Agent`}
                        onClick={() => onSelectToolPreset("agent")}
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="relative min-w-0 flex-1">
              <AnimatePresence initial={false}>
                {showMentions ? (
                  <motion.div
                    key="mentions"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
                    className="absolute inset-x-0 bottom-full z-10 mb-2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md"
                  >
                    {mentionSuggestions.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className="flex w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => onSelectMention(node)}
                      >
                        {node.title}
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Textarea
                value={draft}
                rows={1}
                placeholder={placeholder}
                aria-label="Message to agent"
                autoFocus
                className={cn(
                  "max-h-40 min-h-7 field-sizing-content resize-none rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-5 text-foreground shadow-none",
                  "placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0",
                )}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
              />
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="max-w-[7.5rem] truncate rounded-full px-2 text-muted-foreground hover:text-foreground"
                onClick={onOpenModelLibrary}
              >
                <Sparkles data-icon="inline-start" />
                <span className="truncate">{selectedModelLabel}</span>
              </Button>

              <Button
                type="button"
                variant={scopeModeActive ? "secondary" : "ghost"}
                size="icon-sm"
                className={cn(
                  "rounded-full motion-safe:transition-colors motion-safe:duration-150",
                  scopeModeActive && "bg-secondary text-secondary-foreground",
                )}
                aria-pressed={scopeModeActive}
                aria-label="Toggle Scope Mode"
                onClick={onToggleScopeMode}
              >
                <Crosshair />
              </Button>

              <Button
                type="button"
                size="icon-sm"
                className="rounded-full"
                disabled={!canSend}
                aria-label={isPending ? "Stop or wait for reply" : "Send message"}
                onClick={onSend}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isPending ? "pending" : "send"}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.14, ease: [0.25, 1, 0.5, 1] }}
                    className="inline-flex"
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : <Send />}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}
