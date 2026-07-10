import type { DashboardConversationMessage } from "@orch/agent";

import { DashboardAgentToolTraceList } from "@/features/dashboard-agent/agent-chat/dashboard-agent-tool-trace";
import {
  agentChatMessageAssistantClass,
  agentChatMessageUserClass,
} from "@/features/dashboard-agent/dashboard-agent-ui";
import { renderSimpleMarkdown } from "@/lib/utils/render-simple-markdown";
import { cn } from "@/lib/utils";

type DashboardAgentMessageProps = {
  message: DashboardConversationMessage;
};

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardAgentMessage({ message }: DashboardAgentMessageProps) {
  const isUser = message.role === "user";

  return (
    <article
      className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}
      aria-label={isUser ? "Your message" : "Agent message"}
    >
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold text-muted">{isUser ? "You" : "Agent"}</span>
        <time className="text-[11px] text-muted" dateTime={message.createdAt}>
          {formatMessageTime(message.createdAt)}
        </time>
      </div>

      <div className={isUser ? agentChatMessageUserClass : agentChatMessageAssistantClass}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none select-text"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(message.content) }}
          />
        )}

        {!isUser ? <DashboardAgentToolTraceList toolsCalled={message.toolsCalled} /> : null}

        {message.contextNodeTitles.length > 0 ? (
          <p className="mt-2 text-[11px] text-muted">
            Scope: {message.contextNodeTitles.join(", ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
