import { ArrowLeft, AlertTriangle, Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AgencyAttachmentGrid } from "@/components/agency/agency-attachment-grid";
import {
  AgencyTaskComposer,
  type AgencyTaskComposerHandle,
} from "@/components/agency/agency-task-composer";
import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { AgencyTaskMediaPlayer } from "@/components/agency/agency-task-media-player";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgencyTaskMessagesQuery, useAgencyTaskThreadContextQuery } from "@/lib/queries/agency";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type AgencyTaskThreadProps = {
  teamId: string;
  taskId: string;
  projects: Project[];
  onBack: () => void;
};

function getMediaKind(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const mediaKind = (metadata as { mediaKind?: unknown }).mediaKind;
  return typeof mediaKind === "string" ? mediaKind : null;
}

function isAudioAttachment(attachment: {
  mimeType: string;
  durationSeconds?: number | null;
  metadata?: unknown;
}) {
  return (
    attachment.mimeType.startsWith("audio/") ||
    getMediaKind(attachment.metadata) === "audio" ||
    attachment.durationSeconds != null
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function sameDay(left: string, right: string) {
  return new Date(left).toDateString() === new Date(right).toDateString();
}

export function AgencyTaskThread({ teamId, taskId, projects, onBack }: AgencyTaskThreadProps) {
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<AgencyTaskComposerHandle | null>(null);

  const contextQuery = useAgencyTaskThreadContextQuery(teamId, taskId);
  const messagesQuery = useAgencyTaskMessagesQuery(teamId, taskId);

  const messages = [...(messagesQuery.data?.items ?? [])].reverse();
  const context = contextQuery.data;
  const isThreadLoading = contextQuery.isPending || messagesQuery.isPending;
  const isThreadError = contextQuery.isError || messagesQuery.isError;
  const threadError = contextQuery.error ?? messagesQuery.error;
  const project = projects.find((p) => p.id === context?.projectId);

  useEffect(() => {
    if (threadContainerRef.current) {
      threadContainerRef.current.scrollTop = threadContainerRef.current.scrollHeight;
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onBack]);

  function retryThread() {
    void contextQuery.refetch();
    void messagesQuery.refetch();
  }

  return (
    <section
      className="relative flex h-full flex-col rounded-2xl border border-default bg-default"
      onDragOver={(event) => {
        event.preventDefault();
        if (event.dataTransfer?.types.includes("Files")) {
          setIsDraggingFile(true);
        }
      }}
      onDragLeave={(event) => {
        if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingFile(false);
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          void composerRef.current?.uploadFiles(Array.from(files));
        }
      }}
    >
      {isDraggingFile ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm font-bold text-highlighted"
        >
          Drop files to attach them to this task.
        </div>
      ) : null}

      <header className="border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-highlighted">
              {context?.taskTitle ?? "Task"}
            </p>
            <p className="truncate text-xs text-muted">
              {project?.clientName ?? "Client"} · {project?.name ?? "Project"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AgencyMiniTimer
              teamId={teamId}
              taskId={taskId}
              projectId={context?.projectId}
              taskTitle={context?.taskTitle}
              projectName={context?.projectName}
            />
            <div className="flex items-center gap-2">
              <input
                id="agent-toggle"
                type="checkbox"
                checked={agentEnabled}
                onChange={(e) => setAgentEnabled(e.target.checked)}
                className="size-4 rounded border-default"
              />
              <Label htmlFor="agent-toggle" className="text-xs font-semibold">
                Agent
              </Label>
            </div>
          </div>
        </div>
      </header>

      {isThreadLoading ? (
        <div className="flex-1 p-4">
          {[1, 2, 3, 4, 5, 6].map((rowIndex) => (
            <Skeleton key={rowIndex} className="mb-3 h-16 rounded-xl" />
          ))}
        </div>
      ) : isThreadError ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load thread.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(threadError, "Try refreshing.")}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={retryThread}>
            Retry
          </Button>
        </div>
      ) : (
        <div ref={threadContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No messages yet. Start the thread below.
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id}>
                {index === 0 ||
                !sameDay(message.createdAt, messages[index - 1]?.createdAt ?? "") ? (
                  <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted">
                    {formatDate(message.createdAt)}
                  </div>
                ) : null}

                <div
                  className={[
                    "flex gap-3",
                    message.senderType === "agent" ? "rounded-xl bg-primary/5 p-3" : "",
                  ].join(" ")}
                >
                  {message.senderType === "agent" ? (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </div>
                  ) : (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted">
                      {message.userName.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-highlighted">{message.userName}</span>
                      <span className="text-[11px] text-muted">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>

                    {message.type === "text" || message.content ? (
                      <div className="mt-1 whitespace-pre-wrap text-sm text-default">
                        {message.content}
                      </div>
                    ) : null}

                    {message.type === "voice" ||
                    message.attachments.some((a) => isAudioAttachment(a)) ? (
                      <div className="mt-2">
                        {message.attachments
                          .filter((a) => isAudioAttachment(a))
                          .map((attachment) => (
                            <AgencyTaskMediaPlayer
                              key={attachment.id}
                              src={attachment.url ?? undefined}
                              mimeType={attachment.mimeType}
                              fileName={attachment.fileName}
                              mediaKind="audio"
                            />
                          ))}
                      </div>
                    ) : null}

                    <AgencyAttachmentGrid
                      attachments={message.attachments.filter((a) => !isAudioAttachment(a))}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="border-t border-default p-3">
        <AgencyTaskComposer
          ref={composerRef}
          teamId={teamId}
          taskId={taskId}
          agentEnabled={agentEnabled}
          onSent={() => {}}
        />
      </div>
    </section>
  );
}
