import { useState } from "react";
import { Bot, FileText, Globe, Image as ImageIcon, Send } from "lucide-react";

import { AgencyAttachmentInlineView } from "@/features/task-management/task-thread/agency-attachment-inline-view";
import { AgencyTaskVoiceRecorderView } from "@/features/task-management/task-thread/agency-task-voice-recorder-view";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Textarea } from "@/ui/textarea";
import type { TaskThreadComposerViewModel } from "@/features/task-management/hooks/use-task-thread-messaging";
import type { AgencyVoiceRecorderViewModel } from "@/features/task-management/hooks/use-agency-voice-recorder";
import {
  AGENCY_ATTACHMENT_DOCUMENT_ACCEPT,
  AGENCY_ATTACHMENT_IMAGE_ACCEPT,
  deriveLinkLabel,
  normalizeAttachmentUrl,
} from "@/features/task-management/agency-attachment-utils";
import { agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type TaskThreadComposerProps = {
  composer: TaskThreadComposerViewModel;
  voice: AgencyVoiceRecorderViewModel;
};

function TaskThreadUrlAttachmentPopover({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (url: string, label?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewLabel = normalizeAttachmentUrl(url)
    ? deriveLinkLabel(normalizeAttachmentUrl(url)!, label)
    : null;

  const handleSubmit = async () => {
    const normalized = normalizeAttachmentUrl(url);
    if (!normalized) return;

    setIsSubmitting(true);
    try {
      await onAdd(normalized, label.trim() || undefined);
      setUrl("");
      setLabel("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} aria-label="Attach URL">
          <Globe />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-thread-url-input">URL</Label>
          <Input
            id="task-thread-url-input"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://docs.example.com"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-thread-url-label">Label (optional)</Label>
          <Input
            id="task-thread-url-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={previewLabel ?? "Display name"}
            disabled={isSubmitting}
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={!normalizeAttachmentUrl(url) || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          Add link
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function TaskThreadComposer({ composer, voice }: TaskThreadComposerProps) {
  const {
    content,
    isDragging,
    isBusy,
    pendingAttachments,
    agentEnabled,
    placeholder,
    attachmentCountLabel,
    micError,
    onContentChange,
    onSend,
    onKeyDown,
    onPaste,
    onImageInputChange,
    onDocumentInputChange,
    onDrop,
    onDragOver,
    onDragLeave,
    onAttachImageClick,
    onAttachDocumentClick,
    onRemoveAttachment,
    onAddUrlAttachment,
    imageFileInputId,
    documentFileInputId,
  } = composer;

  return (
    <div
      className={cn(
        "relative rounded-xl border border-default bg-muted/30 p-2 transition-colors",
        isDragging && "border-primary bg-primary/5",
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {pendingAttachments.length > 0 ? (
        <AgencyAttachmentInlineView
          attachments={pendingAttachments}
          className="mb-2"
          removable
          onRemove={onRemoveAttachment}
        />
      ) : null}

      <Textarea
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder={placeholder}
        rows={1}
        className={cn(
          "field-sizing-content min-h-8 max-h-40 w-full resize-none",
          agencyInputPlaceholderClass,
        )}
        disabled={isBusy}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />

      {micError ? <p className="mt-1 text-xs text-error">{micError}</p> : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            aria-label="Attach image"
            onClick={onAttachImageClick}
          >
            <ImageIcon />
          </Button>
          <input
            id={imageFileInputId}
            type="file"
            multiple
            accept={AGENCY_ATTACHMENT_IMAGE_ACCEPT}
            className="hidden"
            onChange={onImageInputChange}
          />

          <AgencyTaskVoiceRecorderView view={voice} />

          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            aria-label="Attach document"
            onClick={onAttachDocumentClick}
          >
            <FileText />
          </Button>
          <input
            id={documentFileInputId}
            type="file"
            multiple
            accept={AGENCY_ATTACHMENT_DOCUMENT_ACCEPT}
            className="hidden"
            onChange={onDocumentInputChange}
          />

          <TaskThreadUrlAttachmentPopover disabled={isBusy} onAdd={onAddUrlAttachment} />
        </div>

        <div className="flex items-center gap-2">
          {attachmentCountLabel ? (
            <span className="text-xs text-muted">{attachmentCountLabel}</span>
          ) : null}
          <Button
            size="sm"
            disabled={(!content.trim() && pendingAttachments.length === 0) || isBusy}
            onClick={onSend}
            aria-label={agentEnabled ? "Ask agent" : "Send message"}
          >
            {agentEnabled ? <Bot /> : <Send />}
            {agentEnabled ? "Ask" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
