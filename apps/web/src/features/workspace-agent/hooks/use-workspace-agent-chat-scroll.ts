import { useEffect, useRef } from "react";

export function useWorkspaceAgentChatScroll(args: {
  followOutput: boolean;
  isStreaming: boolean;
  messageCount: number;
  streamingContentLength: number;
  onFollowOutputChange: (follow: boolean) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!args.followOutput) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [args.followOutput, args.isStreaming, args.messageCount, args.streamingContentLength]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node || !args.isStreaming) {
      return;
    }
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distanceFromBottom > 64) {
      args.onFollowOutputChange(false);
    }
  };

  return {
    scrollRef,
    endRef,
    onScroll,
  };
}
