import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

import { AgencyTaskThreadMessageRowView } from "@/features/task-management/task-thread/agency-task-thread-message-row-view";
import type { AgencyTaskThreadTimelineItem } from "@/features/task-management/task-thread/agency-task-thread-timeline";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/ui/message-scroller";
import { MessageGroup } from "@/ui/message";

type AgencyTaskThreadMessageListViewProps = {
  timeline: AgencyTaskThreadTimelineItem[];
  actorUserId: string | null;
  canPost: boolean;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  onLoadOlder: () => void;
  onMentionOrch: (message: AgencyTaskMessage) => void;
  onReply: (message: AgencyTaskMessage) => void;
};

export function AgencyTaskThreadMessageListView({
  timeline,
  actorUserId,
  canPost,
  hasOlder,
  isFetchingOlder,
  onLoadOlder,
  onMentionOrch,
  onReply,
}: AgencyTaskThreadMessageListViewProps) {
  const lastMessageIndex = (() => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      if (timeline[i]?.kind === "message") return i;
    }
    return -1;
  })();

  return (
    <MessageScrollerProvider>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport
          onScroll={(event) => {
            const el = event.currentTarget;
            if (el.scrollTop > 80 || !hasOlder || isFetchingOlder) return;
            onLoadOlder();
          }}
        >
          <MessageScrollerContent className="mx-auto w-full max-w-2xl gap-3 px-3 py-3">
            {timeline.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-muted-foreground">No messages yet</p>
            ) : (
              <MessageGroup className="gap-3">
                {timeline.map((item, index) => {
                  if (item.kind === "day") {
                    return (
                      <MessageScrollerItem key={`day-${item.key}`}>
                        <div
                          role="separator"
                          aria-label={item.label}
                          className="flex items-center gap-3 py-1"
                        >
                          <span className="h-px flex-1 bg-border" />
                          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      </MessageScrollerItem>
                    );
                  }

                  return (
                    <MessageScrollerItem
                      key={item.message.id}
                      scrollAnchor={index === lastMessageIndex}
                    >
                      <AgencyTaskThreadMessageRowView
                        message={item.message}
                        isSelf={Boolean(actorUserId && item.message.userId === actorUserId)}
                        canPost={canPost}
                        onMentionOrch={onMentionOrch}
                        onReply={onReply}
                      />
                    </MessageScrollerItem>
                  );
                })}
              </MessageGroup>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
