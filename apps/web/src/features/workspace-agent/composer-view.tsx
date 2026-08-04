import type {
  AgentModelTier,
  AgentTextAttachment,
  AgentToolCatalogEntry,
  DashboardAgentToolPreset,
} from "@orch/agent/types";
import type { WorkspaceNode } from "@orch/workspace";
import type { ChatStatus, FileUIPart } from "ai";
import {
  Check,
  ChevronDown,
  Crosshair,
  ListTodo,
  MessageCircleQuestion,
  Plus,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  AGENT_ATTACHMENT_ACCEPT,
  AGENT_IMAGE_ATTACHMENT_MAX_BYTES,
  AGENT_TEXT_ATTACHMENT_MAX_FILES,
  filePartsToAgentAttachments,
} from "@/features/workspace-agent/agent-attachments";
import type { WorkspaceAgentConversationOption } from "@/features/workspace-agent/chat-panel-view";
import {
  WorkspaceAgentAttachMenuItem,
  WorkspaceAgentComposerSubmitGate,
  workspaceAgentPlusMenuItemClass,
} from "@/features/workspace-agent/composer-attachment-controls";
import { WorkspaceAgentComposerHistoryBillView } from "@/features/workspace-agent/composer-history-bill-view";
import { WorkspaceAgentModelPresetMenuView } from "@/features/workspace-agent/model-preset-menu-view";
import { WorkspaceAgentScopeChipView } from "@/features/workspace-agent/scope-chip-view";
import { WorkspaceAgentToolMenuView } from "@/features/workspace-agent/tool-menu-view";
import type { WorkspaceAgentScopeChip } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
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
  /** When false, Plan mode is hidden (Canvas). Agency enables Plan. */
  planModeEnabled: boolean;
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
  historyBillOpen: boolean;
  onHistoryBillOpenChange: (open: boolean) => void;
  conversationOptions: WorkspaceAgentConversationOption[];
  conversationsLoading: boolean;
  activeConversationId: string | null;
  activeCostUsd: number;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  deletingConversationId: string | null;
  canSend: boolean;
  isPending: boolean;
  chatStatus: ChatStatus;
  onSend: (input: { text: string; attachments: AgentTextAttachment[] }) => void;
  onStop: () => void;
  dimmed: boolean;
  shellLayoutId?: string;
  nestedInShell?: boolean;
};

const MODE_OPTIONS: Array<{
  preset: DashboardAgentToolPreset;
  label: string;
  helper: string;
}> = [
  { preset: "ask", label: "Ask", helper: "Answers only — no writes" },
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
  planModeEnabled,
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
  historyBillOpen,
  onHistoryBillOpenChange,
  conversationOptions,
  conversationsLoading,
  activeConversationId,
  activeCostUsd,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
  deletingConversationId,
  canSend,
  isPending,
  chatStatus,
  onSend,
  onStop,
  dimmed,
  shellLayoutId,
  nestedInShell = false,
}: WorkspaceAgentComposerViewProps) {
  const showMentions = mentionSuggestions.length > 0;
  const hasChips = scopeChips.length > 0;
  const multiline = draft.includes("\n") || draft.length > 80;
  const selectedModeLabel = modeLabel(selectedToolPreset);
  const SelectedModeIcon = modeIcon(selectedToolPreset);
  const visibleModeOptions = MODE_OPTIONS.filter(
    (mode) => mode.preset !== "plan" || planModeEnabled,
  );
  const compact = !hasChips && !multiline;
  // Nested: flush square. Floating: card radius (never full-pill — that warps the tall footer).
  const borderRadius = nestedInShell ? 0 : 16;
  const modelTooltip = resolvedModelLabel
    ? `${selectedModelLabel} · ${resolvedModelLabel}`
    : selectedModelLabel;

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
              className="mb-2 px-1 text-xs text-foreground/70"
            >
              Sniper on — click anything to add it to scope.
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div
          className={cn(
            "flex items-center justify-end gap-1.5",
            nestedInShell ? "hidden" : "mb-2 px-0.5",
          )}
        >
          <WorkspaceAgentComposerHistoryBillView
            open={historyBillOpen}
            onOpenChange={onHistoryBillOpenChange}
            conversationOptions={conversationOptions}
            conversationsLoading={conversationsLoading}
            activeConversationId={activeConversationId}
            activeCostUsd={activeCostUsd}
            onSelectConversation={onSelectConversation}
            onStartNewConversation={onStartNewConversation}
            onDeleteConversation={onDeleteConversation}
            deletingConversationId={deletingConversationId}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant={scopeModeActive ? "default" : "secondary"}
                aria-pressed={scopeModeActive}
                aria-label={scopeModeActive ? "Exit sniper mode" : "Sniper mode"}
                className="size-7 rounded-full border border-border"
                onClick={onToggleScopeMode}
              >
                <Crosshair className="size-3.5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {scopeModeActive ? "Exit sniper mode" : "Sniper mode — click page items to add scope"}
            </TooltipContent>
          </Tooltip>
        </div>

        <motion.div
          layout
          layoutId={shellLayoutId}
          transition={{ layout: { type: "spring", stiffness: 380, damping: 34 } }}
          style={{ borderRadius }}
          className={cn(
            "overflow-hidden text-card-foreground",
            nestedInShell ? "border-0 bg-transparent" : "border border-border bg-card shadow-lg",
            dimmed && "ring-1 ring-foreground/25",
          )}
        >
          <PromptInput
            className={cn(
              "border-0 bg-transparent shadow-none",
              "[&_[data-slot=input-group]]:rounded-none [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none",
              nestedInShell
                ? "[&_[data-slot=input-group]]:px-1"
                : "[&_[data-slot=input-group]]:p-1",
            )}
            accept={AGENT_ATTACHMENT_ACCEPT}
            multiple
            maxFiles={AGENT_TEXT_ATTACHMENT_MAX_FILES}
            maxFileSize={AGENT_IMAGE_ATTACHMENT_MAX_BYTES}
            onError={(error) => {
              switch (error.code) {
                case "accept":
                  toast.error("Only .txt, .md, .json, and image files.");
                  break;
                case "max_files":
                  toast.error(`Up to ${AGENT_TEXT_ATTACHMENT_MAX_FILES} files.`);
                  break;
                case "max_file_size":
                  toast.error(
                    `Each file must be ${AGENT_IMAGE_ATTACHMENT_MAX_BYTES / 1_000_000} MB or less.`,
                  );
                  break;
                default: {
                  const _exhaustive: never = error.code;
                  return _exhaustive;
                }
              }
            }}
            onSubmit={(message) => {
              if (isPending) return;
              try {
                const attachments = filePartsToAgentAttachments(
                  (message.files ?? []) as FileUIPart[],
                );
                const text = message.text.trim();
                if (!text && attachments.length === 0) return;
                onSend({ text, attachments });
              } catch (submitError) {
                toast.error(
                  submitError instanceof Error
                    ? submitError.message
                    : "Could not attach that file.",
                );
              }
            }}
          >
            <PromptInputHeader className="px-1.5 pt-1.5 empty:hidden">
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <WorkspaceAgentScopeChipView chips={scopeChips} onRemove={onRemoveChip} />
            </PromptInputHeader>

            <PromptInputBody className="relative">
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

              <PromptInputTextarea
                value={draft}
                placeholder={placeholder}
                aria-label="Message to agent"
                autoFocus
                className={cn(
                  "max-h-40 field-sizing-content resize-none rounded-none border-0 bg-transparent px-3 text-[14px] leading-6 text-foreground shadow-none",
                  "placeholder:text-muted-foreground/80 focus-visible:border-transparent focus-visible:ring-0",
                  nestedInShell ? "min-h-9 py-2.5" : "min-h-[52px] py-3.5",
                  compact && nestedInShell && "min-h-10 py-3",
                )}
                onChange={(event) => onDraftChange(event.target.value)}
              />
            </PromptInputBody>

            <PromptInputFooter className={cn("gap-2 px-2 pb-2", !nestedInShell && "pt-0.5")}>
              <PromptInputTools className="gap-1.5">
                <Popover open={toolsMenuOpen} onOpenChange={onToolsMenuOpenChange}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <PromptInputButton
                          aria-label="Modes, context, and tools"
                          className="size-8 rounded-full"
                        >
                          <Plus />
                        </PromptInputButton>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">Modes, context, and tools</TooltipContent>
                  </Tooltip>
                  <PopoverContent
                    align="start"
                    data-workspace-agent-overlay
                    className="w-72 gap-0 p-0"
                  >
                    <div className="flex flex-col gap-0.5 p-1">
                      <WorkspaceAgentAttachMenuItem onSelect={() => onToolsMenuOpenChange(false)} />
                      <button
                        type="button"
                        className={cn(
                          workspaceAgentPlusMenuItemClass,
                          scopeModeActive && "bg-accent text-accent-foreground",
                        )}
                        aria-pressed={scopeModeActive}
                        onClick={() => {
                          onToggleScopeMode();
                          onToolsMenuOpenChange(false);
                        }}
                      >
                        <Crosshair className="size-4 text-muted-foreground" aria-hidden />
                        <span className="flex-1">
                          {scopeModeActive ? "Exit sniper mode" : "Sniper mode"}
                        </span>
                        {scopeModeActive ? (
                          <Check className="size-4 text-foreground" aria-hidden />
                        ) : null}
                      </button>
                    </div>

                    <Separator />

                    <div className="flex flex-col gap-0.5 p-1">
                      {visibleModeOptions.map((mode) => {
                        const selected = selectedToolPreset === mode.preset;
                        const ModeIcon = modeIcon(mode.preset);

                        return (
                          <button
                            key={mode.preset}
                            type="button"
                            className={cn(
                              workspaceAgentPlusMenuItemClass,
                              selected && "bg-accent text-accent-foreground",
                            )}
                            onClick={() => {
                              onSelectToolPreset(mode.preset);
                              onToolsMenuOpenChange(false);
                            }}
                          >
                            <ModeIcon className="size-4 text-muted-foreground" aria-hidden />
                            <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                              <span>{mode.label}</span>
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {mode.helper}
                              </span>
                            </span>
                            {selected ? (
                              <Check className="size-4 text-foreground" aria-hidden />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <Separator />

                    <div className="py-1">
                      <WorkspaceAgentToolMenuView tools={tools} loading={toolsLoading} />
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
                      className="inline-flex h-7 items-center gap-0.5 rounded-full border border-border bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground"
                            aria-label={`Mode: ${selectedModeLabel}. Change mode`}
                            onClick={() => onToolsMenuOpenChange(true)}
                          >
                            <SelectedModeIcon
                              className="size-3.5 text-muted-foreground"
                              aria-hidden
                            />
                            {selectedModeLabel}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {selectedModeLabel} mode — click to change
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
                            aria-label={`Remove ${selectedModeLabel} mode and return to Agent`}
                            onClick={() => onSelectToolPreset("agent")}
                          >
                            <X className="size-3" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Return to Agent</TooltipContent>
                      </Tooltip>
                    </motion.div>
                  ) : null}
                  {scopeModeActive ? (
                    <motion.div
                      key="scope-tag"
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
                            aria-label="Scope mode active. Open tools menu"
                            onClick={() => onToolsMenuOpenChange(true)}
                          >
                            <Crosshair className="size-3.5 text-muted-foreground" aria-hidden />
                            Scope
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Click page items to add them to scope
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
                            aria-label="Exit scope mode"
                            onClick={onToggleScopeMode}
                          >
                            <X className="size-3" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Exit scope mode</TooltipContent>
                      </Tooltip>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </PromptInputTools>

              <PromptInputTools>
                <Popover open={modelMenuOpen} onOpenChange={onModelMenuOpenChange}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <PromptInputButton
                          className="h-8 gap-1 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
                          aria-label={`Model: ${selectedModelLabel}`}
                        >
                          <span>{selectedModelButtonLabel}</span>
                          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
                        </PromptInputButton>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">{modelTooltip}</TooltipContent>
                  </Tooltip>
                  <PopoverContent
                    align="end"
                    side="top"
                    sideOffset={8}
                    className="w-72 rounded-2xl p-3"
                    data-workspace-agent-overlay
                  >
                    <WorkspaceAgentModelPresetMenuView
                      tier={modelTier}
                      auto={modelAuto}
                      free={modelFree}
                      resolvedModelLabel={resolvedModelLabel}
                      onTierChange={onModelTierChange}
                      onAutoChange={onModelAutoChange}
                      onFreeChange={onModelFreeChange}
                      onBrowseAll={() => {
                        onModelMenuOpenChange(false);
                        onOpenModelLibrary();
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <WorkspaceAgentComposerSubmitGate
                  canSend={canSend}
                  isPending={isPending}
                  chatStatus={chatStatus}
                  draft={draft}
                  onStop={onStop}
                />
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}
