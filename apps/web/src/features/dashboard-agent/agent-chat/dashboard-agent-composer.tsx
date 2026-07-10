import type { DashboardAgentChatState } from "@/features/dashboard-agent/hooks/use-dashboard-agent-chat";

import { DashboardAgentMentionMenu } from "@/features/dashboard-agent/agent-chat/dashboard-agent-mention-menu";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import {
  agentChatComposerClass,
  agentChatPresetButtonActiveClass,
  agentChatPresetButtonClass,
  agentChatPresetButtonIdleClass,
  agentChatPresetSegmentClass,
} from "@/features/dashboard-agent/dashboard-agent-ui";
import { cn } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";

type DashboardAgentComposerProps = {
  chat: DashboardAgentChatState;
  scopeKind: "nodes" | "blocks";
  onOpenModelLibrary: () => void;
};

export function DashboardAgentComposer({
  chat,
  scopeKind,
  onOpenModelLibrary,
}: DashboardAgentComposerProps) {
  const showMentions = chat.activeMention !== null && chat.mentionSuggestions.length > 0;

  return (
    <div className={agentChatComposerClass}>
      {chat.selectedNodes.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chat.selectedNodes.map((node) => (
            <Badge key={node.id} variant="secondary" className="rounded-full">
              {node.title}
              <button
                type="button"
                className="ml-1 rounded-full px-0.5 hover:text-destructive"
                aria-label={`Remove ${node.title} from scope`}
                onClick={() => chat.removeMentionedNode(node.id)}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="relative">
        {showMentions ? (
          <DashboardAgentMentionMenu
            suggestions={chat.mentionSuggestions}
            onSelect={(node) => chat.addMentionedNode(node)}
            onDismiss={() => chat.setDraft(chat.draft)}
          />
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            value={chat.draft}
            rows={3}
            placeholder={
              scopeKind === "blocks"
                ? "Ask about blocks in scope. Type @ to mention a node."
                : "Ask about anything. Type @ to mention a node."
            }
            aria-label="Message to agent"
            onChange={(event) => chat.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (showMentions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void chat.sendMessage();
              }
            }}
          />
          <Button
            disabled={!chat.canSend}
            aria-label="Send message"
            className="size-10 shrink-0"
            onClick={() => void chat.sendMessage()}
          >
            {chat.isPending ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className={agentChatPresetSegmentClass} role="group" aria-label="Agent mode">
          {chat.toolPresetOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                agentChatPresetButtonClass,
                chat.selectedToolPreset === option.value
                  ? agentChatPresetButtonActiveClass
                  : agentChatPresetButtonIdleClass,
              )}
              aria-pressed={chat.selectedToolPreset === option.value}
              onClick={() => chat.setSelectedToolPreset(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onOpenModelLibrary}>
          Model
        </Button>

        {chat.selectedModelOption ? (
          <span className="truncate text-xs text-muted">
            {chat.selectedModelOption.name}
            {chat.selectedModelOption.compactPricingLabel !== "—"
              ? ` · ${chat.selectedModelOption.compactPricingLabel}`
              : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
