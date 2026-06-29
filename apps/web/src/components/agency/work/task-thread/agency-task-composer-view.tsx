import { Bot, Paperclip, Send, X } from "lucide-react";

import { AgencyTaskVoiceRecorderView } from "@/components/agency/work/task-thread/agency-task-voice-recorder-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AgencyTaskComposerViewModel } from "@/lib/agency/work/hooks/use-agency-task-composer";
import type { AgencyVoiceRecorderViewModel } from "@/lib/agency/work/hooks/use-agency-voice-recorder";
import { agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskComposerViewProps = {
  composer: AgencyTaskComposerViewModel;
  voice: AgencyVoiceRecorderViewModel;
};

export function AgencyTaskComposerView({ composer, voice }: AgencyTaskComposerViewProps) {
  const {
    content,
    isDragging,
    isBusy,
    pendingAttachments,
    agentEnabled,
    onContentChange,
    onSend,
    onKeyDown,
    onFileInputChange,
    onDrop,
    onDragOver,
    onDragLeave,
    onAttachClick,
    onRemoveAttachment,
    fileInputId,
  } = composer;

  return (
    <div
      className={[
        "relative rounded-xl border border-default bg-muted/30 p-2 transition-colors",
        isDragging ? "border-primary bg-primary/5" : "",
      ].join(" ")}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <Textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={agentEnabled ? "Ask the agent about this task..." : "Write a message..."}
        rows={1}
        className={cn("min-h-8 w-full resize-none", agencyInputPlaceholderClass)}
        disabled={isBusy}
        onKeyDown={onKeyDown}
      />

      {pendingAttachments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment, index) => (
            <Badge key={attachment.storageKey} variant="secondary" className="max-w-full gap-1">
              <span className="truncate">{attachment.fileName}</span>
              <button
                type="button"
                className="text-muted hover:text-highlighted"
                onClick={() => onRemoveAttachment(index)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={isBusy} onClick={onAttachClick}>
            <Paperclip />
          </Button>
          <input
            id={fileInputId}
            type="file"
            multiple
            className="hidden"
            onChange={onFileInputChange}
          />
          <AgencyTaskVoiceRecorderView view={voice} />
        </div>

        <Button
          size="sm"
          disabled={(!content.trim() && pendingAttachments.length === 0) || isBusy}
          onClick={onSend}
        >
          {agentEnabled ? <Bot /> : <Send />}
          {agentEnabled ? "Ask" : "Send"}
        </Button>
      </div>
    </div>
  );
}
