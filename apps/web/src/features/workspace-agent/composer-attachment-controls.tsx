import type { ChatStatus } from "ai";
import { Paperclip } from "lucide-react";

import {
  PromptInputSubmit,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

export const workspaceAgentPlusMenuItemClass = cn(
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
  "motion-safe:transition-colors motion-safe:duration-150",
  "text-foreground hover:bg-accent hover:text-accent-foreground",
);

export function WorkspaceAgentAttachMenuItem({ onSelect }: { onSelect?: () => void }) {
  const attachments = usePromptInputAttachments();
  return (
    <button
      type="button"
      className={workspaceAgentPlusMenuItemClass}
      onClick={() => {
        attachments.openFileDialog();
        onSelect?.();
      }}
    >
      <Paperclip className="size-4 text-muted-foreground" aria-hidden />
      <span className="flex-1">Attach file or image</span>
    </button>
  );
}

export function WorkspaceAgentComposerSubmitGate({
  canSend,
  isPending,
  chatStatus,
  draft,
  onStop,
}: {
  canSend: boolean;
  isPending: boolean;
  chatStatus: ChatStatus;
  draft: string;
  onStop: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const hasPayload = draft.trim().length > 0 || attachments.files.length > 0;
  const label = isPending ? "Stop" : "Send message";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PromptInputSubmit
          status={isPending ? chatStatus : undefined}
          disabled={isPending ? false : !(canSend && hasPayload)}
          variant={isPending ? "secondary" : "default"}
          aria-label={label}
          type={isPending ? "button" : "submit"}
          onClick={isPending ? onStop : undefined}
          className="size-8 rounded-full"
        />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
