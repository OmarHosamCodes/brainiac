import type { DashboardAgentChatState } from "@/hooks/use-dashboard-agent-chat";

import { Button } from "@/components/ui/button";
import {
  agentChatLabelClass,
  agentChatRailClass,
  agentChatRailItemActiveClass,
  agentChatRailItemBaseClass,
  agentChatRailItemIdleClass,
  agentChatRailSlideoverClass,
} from "@/lib/utils/dashboard-agent-ui";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardAgentThreadRailProps = {
  chat: DashboardAgentChatState;
  expanded: boolean;
  slideover: boolean;
  onToggleExpanded: () => void;
  onSelectConversation: () => void;
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardAgentThreadRail({
  chat,
  expanded,
  slideover,
  onToggleExpanded,
  onSelectConversation,
}: DashboardAgentThreadRailProps) {
  if (!expanded) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-default bg-elevated py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl"
          aria-label="Show conversations"
          onClick={onToggleExpanded}
        >
          <PanelLeftOpen className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 size-9 rounded-xl"
          aria-label="New conversation"
          onClick={() => {
            chat.startNewConversation();
            onSelectConversation();
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    );
  }

  const railClass = slideover ? agentChatRailSlideoverClass : agentChatRailClass;

  return (
    <nav className={cn(railClass, slideover && "z-30")} aria-label="Conversations">
      <div className="flex items-center justify-between gap-2 border-b border-default px-3 py-2.5">
        <p className={agentChatLabelClass}>Threads</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            aria-label="New conversation"
            onClick={() => {
              chat.startNewConversation();
              onSelectConversation();
            }}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            aria-label={slideover ? "Close conversations" : "Collapse conversations"}
            onClick={onToggleExpanded}
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {chat.isLoadingConversations ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : chat.conversationOptions.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted">No conversations yet.</p>
        ) : (
          <ul className="space-y-1">
            {chat.conversationOptions.map((conversation) => {
              const isActive = chat.activeConversationId === conversation.id;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={cn(
                      agentChatRailItemBaseClass,
                      isActive ? agentChatRailItemActiveClass : agentChatRailItemIdleClass,
                    )}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => {
                      chat.setActiveConversationId(conversation.id);
                      onSelectConversation();
                    }}
                  >
                    <span className="truncate text-sm font-semibold">{conversation.label}</span>
                    <span className="truncate text-xs text-muted">{conversation.preview}</span>
                    <span className="text-[10px] text-muted">
                      {formatRelativeTime(conversation.meta)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
