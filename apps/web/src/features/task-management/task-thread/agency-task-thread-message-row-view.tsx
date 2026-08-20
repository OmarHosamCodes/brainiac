import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";
import { AtSign, Loader2, Reply, Sparkles } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { parseTaskMessageReplyQuote } from "@/features/task-management/task-thread/agency-task-thread-message-actions";
import {
  formatTaskMessageAbsoluteTime,
  formatTaskMessageSmartTime,
} from "@/features/task-management/task-thread/agency-task-thread-message-time";
import { Button } from "@/ui/button";
import { Message, MessageAvatar, MessageContent, MessageHeader } from "@/ui/message";
import { cn } from "@/lib/utils";

type AgencyTaskThreadMessageRowViewProps = {
  message: AgencyTaskMessage;
  isSelf: boolean;
  canPost: boolean;
  onMentionOrch: (message: AgencyTaskMessage) => void;
  onReply: (message: AgencyTaskMessage) => void;
};

export function AgencyTaskThreadMessageRowView({
  message,
  isSelf,
  canPost,
  onMentionOrch,
  onReply,
}: AgencyTaskThreadMessageRowViewProps) {
  const isAgent = message.authorKind === "agent";
  const showActions = !message.pending && !isAgent && canPost;
  const smartTime = formatTaskMessageSmartTime(message.createdAt);
  const absoluteTime = formatTaskMessageAbsoluteTime(message.createdAt);
  const replyQuote = isAgent ? null : parseTaskMessageReplyQuote(message.content);
  const bodyText = replyQuote ? replyQuote.body : message.content;
  const isStreaming = Boolean(message.streaming);
  const showLoading = isAgent && (isStreaming || message.pending) && !bodyText.trim();

  return (
    <div className={cn("group/message-row relative", message.pending && !isAgent && "opacity-70")}>
      <Message align={isSelf && !isAgent ? "end" : "start"}>
        <MessageAvatar>
          {isAgent ? (
            <span
              className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-hidden
            >
              <Sparkles className="size-3.5" />
            </span>
          ) : (
            <AgencyMemberAvatar
              name={isSelf ? "You" : message.userName}
              userId={message.userId}
              avatarUrl={message.userAvatar}
              size="sm"
              className="size-7 rounded-full"
            />
          )}
        </MessageAvatar>
        <MessageContent>
          {isAgent ? <MessageHeader>Orch</MessageHeader> : null}
          {!isAgent && !isSelf ? <MessageHeader>{message.userName}</MessageHeader> : null}
          {showLoading ? (
            <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              <span>Thinking…</span>
            </div>
          ) : bodyText || replyQuote ? (
            <div className="relative w-fit max-w-full">
              <div
                className={cn(
                  "w-fit max-w-full px-3 py-1.5 text-[13px] leading-snug tracking-normal",
                  isAgent
                    ? "rounded-2xl rounded-bl-md bg-muted text-foreground"
                    : isSelf
                      ? "rounded-2xl rounded-br-md bg-secondary text-secondary-foreground"
                      : "rounded-2xl rounded-bl-md bg-muted text-foreground",
                )}
              >
                {replyQuote ? (
                  <div
                    className={cn(
                      "mb-1.5 rounded-md px-2 py-1 text-[11px] leading-snug",
                      isSelf
                        ? "bg-background/40 text-secondary-foreground/80"
                        : "bg-background/50 text-muted-foreground",
                    )}
                  >
                    <p className="font-medium text-foreground/90">{replyQuote.authorName}</p>
                    <p className="line-clamp-2 whitespace-normal">{replyQuote.preview}</p>
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  {bodyText ? (
                    <p className="min-w-0 flex-1 whitespace-pre-wrap font-sans">
                      {bodyText}
                      {isStreaming ? (
                        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-foreground/50 align-middle" />
                      ) : null}
                    </p>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <span
                    className={cn(
                      "mb-px shrink-0 self-end text-[10px] leading-none tabular-nums",
                      isSelf && !isAgent ? "text-secondary-foreground/55" : "text-muted-foreground",
                    )}
                  >
                    <time dateTime={message.createdAt} title={absoluteTime}>
                      {smartTime}
                    </time>
                    {message.pending && !isAgent ? (
                      <span className="ml-1 font-medium opacity-80">Sending</span>
                    ) : null}
                  </span>
                </div>
              </div>
              {showActions ? (
                <div
                  className={cn(
                    "pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 opacity-0 shadow-sm transition-opacity",
                    "group-hover/message-row:pointer-events-auto group-hover/message-row:opacity-100",
                    "group-focus-within/message-row:pointer-events-auto group-focus-within/message-row:opacity-100",
                    isSelf ? "right-full mr-1.5" : "left-full ml-1.5",
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    aria-label="Reply"
                    onClick={() => onReply(message)}
                  >
                    <Reply className="size-3.5" />
                    Reply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    aria-label="Mention Orch"
                    onClick={() => onMentionOrch(message)}
                  >
                    <AtSign className="size-3.5" />
                    Orch
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </MessageContent>
      </Message>
    </div>
  );
}
