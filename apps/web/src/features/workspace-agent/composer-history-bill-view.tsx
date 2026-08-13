import { Plus, Receipt } from "lucide-react";

import { ThreadList } from "@/components/elements/thread-list";
import type { WorkspaceAgentConversationOption } from "@/features/workspace-agent/chat-panel-view";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

function formatUsd(costUsd: number): string {
  if (costUsd <= 0) return "$0";
  if (costUsd < 0.01) return "<$0.01";
  if (costUsd < 1) return `$${costUsd.toFixed(3)}`;
  return `$${costUsd.toFixed(2)}`;
}

function formatConversationStamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type WorkspaceAgentComposerHistoryBillViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationOptions: WorkspaceAgentConversationOption[];
  conversationsLoading: boolean;
  activeConversationId: string | null;
  activeCostUsd: number;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  deletingConversationId: string | null;
};

/** Floating usage bill — opens recent chat history with per-thread spend. */
export function WorkspaceAgentComposerHistoryBillView({
  open,
  onOpenChange,
  conversationOptions,
  conversationsLoading,
  activeConversationId,
  activeCostUsd,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
  deletingConversationId,
}: WorkspaceAgentComposerHistoryBillViewProps) {
  const billLabel = formatUsd(activeCostUsd);
  const hasSpend = activeCostUsd > 0;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label={`Usage bill ${billLabel}. Open chat history`}
              className={cn(
                "h-7 gap-1 rounded-full border border-border px-2.5 text-xs font-medium",
                hasSpend ? "text-info" : "text-muted-foreground",
              )}
            >
              <Receipt className="size-3.5" aria-hidden />
              <span className="tabular-nums">{billLabel}</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Usage bill & history</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        data-workspace-agent-overlay
        className="w-80 gap-0 overflow-hidden rounded-2xl p-0"
      >
        <div className="border-b border-border bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            This chat
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{billLabel}</p>
          <p className="text-xs text-muted-foreground">Model spend for the active thread</p>
        </div>

        <div className="flex flex-col gap-0.5 p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onStartNewConversation();
              onOpenChange(false);
            }}
          >
            <Plus className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="flex-1">New conversation</span>
          </button>
        </div>

        <Separator />

        <div className="max-h-64 overflow-y-auto p-1">
          {conversationsLoading ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">Loading…</p>
          ) : conversationOptions.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">No saved chats yet</p>
          ) : (
            <ThreadList
              className="max-w-none"
              threads={conversationOptions.map((conversation) => ({
                title: conversation.label,
                time:
                  formatConversationStamp(conversation.stamp) ?? formatUsd(conversation.costUsd),
              }))}
              activeIndex={conversationOptions.findIndex(
                (conversation) => conversation.id === activeConversationId,
              )}
              onActiveIndexChange={(index) => {
                const conversation = conversationOptions[index];
                if (!conversation) return;
                onSelectConversation(conversation.id);
                onOpenChange(false);
              }}
              onDelete={(index) => {
                const conversation = conversationOptions[index];
                if (!conversation || deletingConversationId === conversation.id) return;
                onDeleteConversation(conversation.id);
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
