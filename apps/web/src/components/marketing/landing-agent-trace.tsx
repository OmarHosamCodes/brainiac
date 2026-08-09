import { formatModelPresetButtonLabel } from "@orch/agent/model-routing";
import { ChevronDown, CornerDownLeft, History, MoreHorizontal, Plus } from "lucide-react";

import { marketingAgentThinkingSteps } from "@/components/marketing/marketing-demo-data";
import { WorkspaceAgentAssistantTextView } from "@/features/workspace-agent/assistant-text-view";
import { WorkspaceAgentThinkingActivityView } from "@/features/workspace-agent/thinking-activity-view";
import { cn } from "@/lib/utils";
import { Bubble, BubbleContent } from "@/ui/bubble";
import { Message, MessageContent } from "@/ui/message";

const USER_PROMPT = "Add a launch checklist to Q2 Launch and find agency time sync notes.";
const ASSISTANT_STREAM =
  "I read **Q2 Launch**, added a checklist block, and I am searching the workspace for agency time sync references.";
const MODEL_LABEL = formatModelPresetButtonLabel({
  tier: "balanced",
  auto: true,
  free: false,
});

export function LandingAgentTrace({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg",
        className,
      )}
      aria-hidden
    >
      <div className="flex min-h-12 items-center gap-2 border-b border-border bg-muted/20 px-3">
        <span className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground">
          <History className="size-4" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">
          {USER_PROMPT}
        </p>
        <span className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground">
          <MoreHorizontal className="size-4" />
        </span>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        <Message align="end">
          <MessageContent>
            <Bubble variant="secondary" align="end" className="max-w-[min(100%,36rem)]">
              <BubbleContent className="whitespace-pre-wrap text-pretty">
                {USER_PROMPT}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>

        <Message align="start">
          <MessageContent>
            <Bubble variant="ghost" className="max-w-[min(100%,36rem)]">
              <BubbleContent className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                <WorkspaceAgentAssistantTextView text={ASSISTANT_STREAM} />
                <span className="ms-0.5 inline-block h-3.5 w-1 translate-y-px rounded-sm bg-foreground/55 motion-safe:animate-pulse" />
              </BubbleContent>
            </Bubble>
            <WorkspaceAgentThinkingActivityView
              steps={marketingAgentThinkingSteps.map((step) => ({ ...step }))}
              live
            />
          </MessageContent>
        </Message>
      </div>

      <div className="border-t border-border">
        <div className="px-1 pt-1">
          <p className="min-h-9 px-3 py-2.5 text-[14px] leading-6 text-muted-foreground/80">
            Ask about this canvas
          </p>
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground">
                <Plus className="size-4" />
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm text-muted-foreground">
                {MODEL_LABEL}
                <ChevronDown className="size-3.5 shrink-0 opacity-70" />
              </span>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CornerDownLeft className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
