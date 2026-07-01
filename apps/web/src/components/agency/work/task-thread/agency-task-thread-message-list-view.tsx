import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { AgencyTaskThreadMessageView } from "@/components/agency/work/task-thread/agency-task-message-attachments-view";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { AgencyTaskThreadMessageViewModel } from "@/lib/agency/work/hooks/use-agency-task-thread";
import {
  AGENCY_THREAD_MESSAGE_DURATION,
  AGENCY_THREAD_MESSAGE_EASE,
} from "@/lib/utils/agency-thread-motion";

type AgencyTaskThreadMessageListViewProps = {
  messages: AgencyTaskThreadMessageViewModel[];
  threadContainerRef: React.RefObject<HTMLDivElement | null>;
};

function AgencyTaskThreadMessageMotionItem({
  message,
  reducedMotion,
}: {
  message: AgencyTaskThreadMessageViewModel;
  reducedMotion: boolean;
}) {
  const duration = reducedMotion ? 0 : AGENCY_THREAD_MESSAGE_DURATION;

  return (
    <motion.div
      layout="position"
      layoutId={`agency-task-thread-message-${message.animationKey}`}
      initial={
        reducedMotion
          ? false
          : {
              opacity: 0,
              y: 6,
              scale: 0.985,
            }
      }
      animate={{
        opacity: message.isOptimistic ? 0.72 : 1,
        y: 0,
        scale: 1,
      }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: -4,
              scale: 0.985,
            }
      }
      transition={{
        duration,
        ease: AGENCY_THREAD_MESSAGE_EASE,
        layout: { duration, ease: AGENCY_THREAD_MESSAGE_EASE },
        opacity: {
          duration: message.isOptimistic ? duration : duration,
          ease: AGENCY_THREAD_MESSAGE_EASE,
        },
      }}
    >
      <AgencyTaskThreadMessageView
        senderType={message.senderType}
        userName={message.userName}
        createdAt={message.createdAt}
        showDateDivider={message.showDateDivider}
        dateLabel={message.dateLabel}
        attachments={message.attachments}
        messageType={message.type}
        content={message.content}
      />
    </motion.div>
  );
}

export function AgencyTaskThreadMessageListView({
  messages,
  threadContainerRef,
}: AgencyTaskThreadMessageListViewProps) {
  const reducedMotion = usePrefersReducedMotion();
  const scrollAnchorKey =
    messages.length > 0 ? messages[messages.length - 1]?.animationKey : "empty";

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => threadContainerRef.current,
    estimateSize: () => 88,
    overscan: 6,
  });

  useEffect(() => {
    const container = threadContainerRef.current;
    if (!container || messages.length === 0) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages.length, scrollAnchorKey, threadContainerRef, reducedMotion]);

  return (
    <LayoutGroup id="agency-task-thread-messages">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const message = messages[virtualRow.index];
            if (!message) return null;

            return (
              <div
                key={message.animationKey}
                className="absolute top-0 left-0 w-full px-1"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <AgencyTaskThreadMessageMotionItem
                  message={message}
                  reducedMotion={reducedMotion}
                />
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
