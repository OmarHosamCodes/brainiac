import type { ChatStatus } from "ai";
import { Paperclip } from "lucide-react";

import {
  PromptInputButton,
  PromptInputSubmit,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";

export function WorkspaceAgentAttachButton() {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      aria-label="Attach file or image"
      onClick={() => attachments.openFileDialog()}
    >
      <Paperclip />
    </PromptInputButton>
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
  return (
    <PromptInputSubmit
      status={isPending ? chatStatus : undefined}
      disabled={isPending ? false : !(canSend && hasPayload)}
      variant={isPending ? "secondary" : "default"}
      aria-label={isPending ? "Stop" : "Send message"}
      type={isPending ? "button" : "submit"}
      onClick={isPending ? onStop : undefined}
    />
  );
}
