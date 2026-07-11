import { useCallback, useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

const NEAR_BOTTOM_THRESHOLD_PX = 80;
const LOAD_OLDER_THRESHOLD_PX = 120;

type UseTaskThreadScrollOptions = {
  messageCount: number;
  scrollAnchorKey: string;
  hasOlderMessages: boolean;
  isFetchingOlder: boolean;
  onLoadOlder: () => void;
  forceScrollToBottom?: boolean;
};

export function useTaskThreadScroll({
  messageCount,
  scrollAnchorKey,
  hasOlderMessages,
  isFetchingOlder,
  onLoadOlder,
  forceScrollToBottom = false,
}: UseTaskThreadScrollOptions) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const previousScrollHeightRef = useRef(0);

  const updateNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
    isNearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom && messageCount > 0);
  }, [messageCount]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth") => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior });
      isNearBottomRef.current = true;
      setShowJumpToLatest(false);
    },
    [reducedMotion],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || messageCount === 0) return;

    if (forceScrollToBottom || isNearBottomRef.current) {
      scrollToBottom(reducedMotion ? "auto" : "smooth");
    }
  }, [messageCount, scrollAnchorKey, forceScrollToBottom, reducedMotion, scrollToBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      updateNearBottom();

      if (hasOlderMessages && !isFetchingOlder && container.scrollTop <= LOAD_OLDER_THRESHOLD_PX) {
        previousScrollHeightRef.current = container.scrollHeight;
        onLoadOlder();
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasOlderMessages, isFetchingOlder, onLoadOlder, updateNearBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isFetchingOlder) return;

    const previousHeight = previousScrollHeightRef.current;
    if (previousHeight <= 0) return;

    requestAnimationFrame(() => {
      const delta = container.scrollHeight - previousHeight;
      if (delta > 0) {
        container.scrollTop += delta;
      }
    });
  }, [isFetchingOlder, messageCount]);

  return {
    containerRef,
    showJumpToLatest,
    scrollToBottom,
  };
}
