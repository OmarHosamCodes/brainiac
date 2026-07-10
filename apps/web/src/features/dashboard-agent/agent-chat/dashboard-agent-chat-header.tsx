import type { DashboardAgentChatState } from "@/features/dashboard-agent/hooks/use-dashboard-agent-chat";

import { Button } from "@/ui/button";
import { agentChatLabelClass } from "@/features/dashboard-agent/dashboard-agent-ui";
import { Pencil, Trash2, X } from "lucide-react";

type DashboardAgentChatHeaderProps = {
  chat: DashboardAgentChatState;
  onClose?: () => void;
  onToggleRail?: () => void;
  scopeBadges?: React.ReactNode;
};

export function DashboardAgentChatHeader({
  chat,
  onClose,
  onToggleRail,
  scopeBadges,
}: DashboardAgentChatHeaderProps) {
  return (
    <>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className={agentChatLabelClass}>Agent</p>
          <p className="truncate text-sm font-semibold text-highlighted">
            {chat.activeConversationTitle}
          </p>
          <p className="truncate text-xs text-muted">{chat.scopeLabel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onToggleRail ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl lg:hidden"
              aria-label="Toggle conversation list"
              onClick={onToggleRail}
            >
              <span className="text-xs font-bold">List</span>
            </Button>
          ) : null}

          {chat.canRenameConversation ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl"
              aria-label="Rename conversation"
              onClick={chat.openRenameDialog}
            >
              <Pencil className="size-4" />
            </Button>
          ) : null}

          {chat.canDeleteConversation ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-destructive hover:text-destructive"
              aria-label="Delete conversation"
              onClick={chat.openDeleteDialog}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}

          {onClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl"
              aria-label="Close agent panel"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </header>

      {scopeBadges ? (
        <div className="shrink-0 border-b border-default px-4 py-2">{scopeBadges}</div>
      ) : null}
    </>
  );
}
