import type { AgentToolCatalogEntry, DashboardAgentToolPreset } from "@orch/agent";
import type { WorkspaceNode } from "@orch/workspace";
import { Box, Crosshair, Loader2, Plus, Send, Sparkles } from "lucide-react";

import { WorkspaceAgentScopeChipView } from "@/features/workspace-agent/scope-chip-view";
import { WorkspaceAgentToolMenuView } from "@/features/workspace-agent/tool-menu-view";
import type { WorkspaceAgentScopeChip } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
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
};

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
}: WorkspaceAgentComposerViewProps) {
  const showMentions = mentionSuggestions.length > 0;

  return (
    <div className={cn("bg-default", dimmed && "opacity-80")}>
      <WorkspaceAgentScopeChipView chips={scopeChips} onRemove={onRemoveChip} />

      {!scopeHintSeen && scopeModeActive ? (
        <p className="px-3 pt-2 text-xs text-muted">Click anything to add it to scope.</p>
      ) : null}

      <div className="relative px-3 pt-2">
        {showMentions ? (
          <div className="absolute inset-x-3 bottom-full z-10 mb-1 overflow-hidden rounded-xl border border-default bg-default shadow-md">
            {mentionSuggestions.map((node) => (
              <button
                key={node.id}
                type="button"
                className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                onClick={() => onSelectMention(node)}
              >
                {node.title}
              </button>
            ))}
          </div>
        ) : null}

        <Textarea
          value={draft}
          rows={2}
          placeholder={placeholder}
          aria-label="Message to agent"
          className="min-h-[64px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
      </div>

      <div className="flex items-center gap-1 px-2 pb-2">
        <Popover open={toolsMenuOpen} onOpenChange={onToolsMenuOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Add context and tools">
              <Plus />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <div className="border-b border-default px-3 py-2">
              <p className="text-xs font-semibold text-muted">Tools</p>
            </div>
            <WorkspaceAgentToolMenuView tools={tools} loading={toolsLoading} />
            <div className="border-t border-default p-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onToolsMenuOpenChange(false);
                  onOpenModelLibrary();
                }}
              >
                <Box data-icon="inline-start" />
                Models
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="inline-flex rounded-xl border border-default bg-muted/30 p-0.5">
          <button
            type="button"
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              selectedToolPreset === "ask"
                ? "bg-default text-highlighted shadow-sm"
                : "text-muted hover:text-highlighted",
            )}
            onClick={() => onSelectToolPreset("ask")}
          >
            Ask
          </button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={agentModeDisabled}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                    selectedToolPreset === "agent"
                      ? "bg-default text-highlighted shadow-sm"
                      : "text-muted hover:text-highlighted",
                    agentModeDisabled && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => {
                    if (!agentModeDisabled) onSelectToolPreset("agent");
                  }}
                >
                  Agent
                </button>
              </TooltipTrigger>
              {agentModeDisabled ? (
                <TooltipContent>Agent edits are canvas-only for now</TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-w-[9rem] truncate"
          onClick={onOpenModelLibrary}
        >
          <Sparkles data-icon="inline-start" />
          {selectedModelLabel}
        </Button>

        <Button
          type="button"
          variant={scopeModeActive ? "secondary" : "ghost"}
          size="icon-sm"
          aria-pressed={scopeModeActive}
          aria-label="Toggle Scope Mode"
          onClick={onToggleScopeMode}
        >
          <Crosshair />
        </Button>

        <div className="ml-auto">
          <Button
            type="button"
            size="icon-sm"
            disabled={!canSend}
            aria-label="Send message"
            onClick={onSend}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  );
}
