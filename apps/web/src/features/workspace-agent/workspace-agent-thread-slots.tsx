import type { AiUiArtifact } from "@orch/agent/types";
import { useAuiState } from "@assistant-ui/react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { EmptyState, EmptyStateGreeting } from "@/components/elements/empty-state";
import { MapAnswer } from "@/components/elements/map-answer";
import { MessageAttachments } from "@/components/elements/message-attachment";
import { ReadAloud } from "@/components/elements/read-aloud";
import { ToolError } from "@/components/elements/tool-error";
import { ToolGroup } from "@/components/elements/tool-group";
import { AgencyPlanCardView } from "@/features/workspace-agent/agency-plan-card-view";
import { AgencyProposalCardView } from "@/features/workspace-agent/agency-proposal-card-view";
import { AgencyQuestionCardView } from "@/features/workspace-agent/agency-question-card-view";
import { AgentMessageArtifactCardView } from "@/features/workspace-agent/agent-message-artifact-card-view";
import { AgentStickyArchiveReceiptView } from "@/features/workspace-agent/agent-sticky-dock-view";
import { WorkspaceAgentAssistantTextView } from "@/features/workspace-agent/assistant-text-view";
import {
  getMessageArtifacts,
  getMessageAttachments,
  getMessageText,
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { extractMapPinsFromToolParts } from "@/features/workspace-agent/workspace-agent-map-pins";
import { WorkspaceAgentQuickStartChipsView } from "@/features/workspace-agent/quick-start-chips-view";
import type { WorkspaceAgentQuickStart } from "@/features/workspace-agent/workspace-agent-quick-starts";
import { isPartStickyDocked, type StickyDockItem } from "@/features/workspace-agent/sticky-dock";
import { WorkspaceAgentThinkingActivityView } from "@/features/workspace-agent/thinking-activity-view";
import { Bubble, BubbleContent } from "@/ui/bubble";
import { Marker, MarkerContent } from "@/ui/marker";
import { Message, MessageContent } from "@/ui/message";

export type WorkspaceAgentThreadMessageContextValue = {
  messages: OrchUIMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamStopped: boolean;
  proposalBusyId: string | null;
  planConfirmingId: string | null;
  answeredQuestionIds: ReadonlySet<string>;
  resolvedPlanIds: ReadonlySet<string>;
  resolvedProposalIds: ReadonlySet<string>;
  stickyItem: StickyDockItem | null;
  questionSubmittingId: string | null;
  questionDrafts: Record<string, { selectedOptionIds: string[]; freeText: string }>;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onAnswerQuestion: (answer: OrchAgencyQuestionAnswer) => void;
  onQuestionSelectedOptionIdsChange: (questionId: string, ids: string[]) => void;
  onQuestionFreeTextChange: (questionId: string, value: string) => void;
  onOpenArtifactCanvas: (artifact: AiUiArtifact) => void;
  onOpenBoard?: (href: string) => void;
  emptyHint: string;
  quickStarts: WorkspaceAgentQuickStart[];
  onSelectQuickStart: (start: WorkspaceAgentQuickStart) => void;
};

const WorkspaceAgentThreadMessageContext =
  createContext<WorkspaceAgentThreadMessageContextValue | null>(null);

export function WorkspaceAgentThreadMessageProvider({
  value,
  children,
}: {
  value: WorkspaceAgentThreadMessageContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceAgentThreadMessageContext.Provider value={value}>
      {children}
    </WorkspaceAgentThreadMessageContext.Provider>
  );
}

export function WorkspaceAgentThreadWelcome() {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  return (
    <EmptyState className="mx-auto py-8">
      <EmptyStateGreeting className="text-sm font-normal text-muted-foreground">
        {ctx.emptyHint}
      </EmptyStateGreeting>
      <WorkspaceAgentQuickStartChipsView
        starts={ctx.quickStarts}
        visible={ctx.quickStarts.length > 0}
        onSelect={ctx.onSelectQuickStart}
        className="max-w-md justify-center"
        density="comfortable"
      />
    </EmptyState>
  );
}

export function WorkspaceAgentThreadAssistantMessage() {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  const messageId = useAuiState((state) => state.message.id);
  if (!ctx) return null;
  const message = ctx.messages.find((entry) => entry.id === messageId);
  if (!message) return null;
  const isStreamingMessage =
    ctx.isStreaming && message.role === "assistant" && message.id === ctx.streamingMessageId;
  const messageIndex = ctx.messages.findIndex((entry) => entry.id === message.id);
  let lastAssistantIndex = -1;
  for (let index = ctx.messages.length - 1; index >= 0; index -= 1) {
    if (ctx.messages[index]?.role === "assistant") {
      lastAssistantIndex = index;
      break;
    }
  }
  const isLastAssistant = message.role === "assistant" && messageIndex === lastAssistantIndex;
  return (
    <Message align="start">
      <MessageContent>
        <WorkspaceAgentMessagePartsView
          message={message}
          isStreamingMessage={isStreamingMessage}
          proposalBusyId={ctx.proposalBusyId}
          planConfirmingId={ctx.planConfirmingId}
          answeredQuestionIds={ctx.answeredQuestionIds}
          resolvedPlanIds={ctx.resolvedPlanIds}
          resolvedProposalIds={ctx.resolvedProposalIds}
          stickyItem={ctx.stickyItem}
          questionSubmittingId={ctx.questionSubmittingId}
          questionDrafts={ctx.questionDrafts}
          onConfirmPlan={ctx.onConfirmPlan}
          onApproveProposal={ctx.onApproveProposal}
          onRejectProposal={ctx.onRejectProposal}
          onOpenBoard={ctx.onOpenBoard}
          onAnswerQuestion={ctx.onAnswerQuestion}
          onQuestionSelectedOptionIdsChange={ctx.onQuestionSelectedOptionIdsChange}
          onQuestionFreeTextChange={ctx.onQuestionFreeTextChange}
          onOpenArtifactCanvas={ctx.onOpenArtifactCanvas}
        />
        {ctx.streamStopped && !ctx.isStreaming && isLastAssistant ? (
          <Marker>
            <MarkerContent className="text-muted-foreground">Stopped</MarkerContent>
          </Marker>
        ) : null}
      </MessageContent>
    </Message>
  );
}

function WorkspaceAgentMessagePartsView({
  message,
  isStreamingMessage,
  proposalBusyId,
  planConfirmingId,
  answeredQuestionIds,
  resolvedPlanIds,
  resolvedProposalIds,
  stickyItem,
  questionSubmittingId,
  questionDrafts,
  onConfirmPlan,
  onApproveProposal,
  onRejectProposal,
  onAnswerQuestion,
  onQuestionSelectedOptionIdsChange,
  onQuestionFreeTextChange,
  onOpenArtifactCanvas,
  onOpenBoard,
}: {
  message: OrchUIMessage;
  isStreamingMessage: boolean;
  proposalBusyId: string | null;
  planConfirmingId: string | null;
  answeredQuestionIds: ReadonlySet<string>;
  resolvedPlanIds: ReadonlySet<string>;
  resolvedProposalIds: ReadonlySet<string>;
  stickyItem: StickyDockItem | null;
  questionSubmittingId: string | null;
  questionDrafts: Record<string, { selectedOptionIds: string[]; freeText: string }>;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onAnswerQuestion: (answer: OrchAgencyQuestionAnswer) => void;
  onQuestionSelectedOptionIdsChange: (questionId: string, ids: string[]) => void;
  onQuestionFreeTextChange: (questionId: string, value: string) => void;
  onOpenArtifactCanvas: (artifact: AiUiArtifact) => void;
  onOpenBoard?: (href: string) => void;
}) {
  const text = getMessageText(message);
  const attachments = getMessageAttachments(message);
  const messageArtifacts = getMessageArtifacts(message);
  const toolParts = message.parts.flatMap((part) => {
    if (part.type !== "dynamic-tool") return [];
    return [
      {
        type: "dynamic-tool" as const,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        state: part.state,
        input: "input" in part ? part.input : undefined,
        output: "output" in part ? part.output : undefined,
        errorText: "errorText" in part ? part.errorText : undefined,
      } satisfies OrchToolPart,
    ];
  });
  const mapPins = extractMapPinsFromToolParts(toolParts);
  const planParts = message.parts.filter(
    (part): part is { type: "data-orchPlan"; id?: string; data: OrchUIDataParts["orchPlan"] } =>
      part.type === "data-orchPlan",
  );
  const proposalParts = message.parts.filter(
    (
      part,
    ): part is {
      type: "data-orchProposal";
      id?: string;
      data: OrchUIDataParts["orchProposal"];
    } => part.type === "data-orchProposal",
  );
  const questionParts = message.parts.filter(
    (
      part,
    ): part is {
      type: "data-orchQuestion";
      id?: string;
      data: OrchUIDataParts["orchQuestion"];
    } => part.type === "data-orchQuestion",
  );
  const hasPrimaryContent =
    questionParts.length > 0 ||
    planParts.length > 0 ||
    proposalParts.length > 0 ||
    messageArtifacts.length > 0 ||
    Boolean(text);
  return (
    <>
      {attachments.length > 0 ? (
        <MessageAttachments
          className={message.role === "user" ? "ms-auto" : undefined}
          attachments={attachments.map((attachment, index) => ({
            id: `${attachment.filename}-${index}`,
            name: attachment.filename,
            size: attachment.mediaType,
            kind:
              attachment.previewUrl || attachment.mediaType.startsWith("image/") ? "image" : "file",
            ...(attachment.previewUrl ? { swatch: `url("${attachment.previewUrl}")` } : {}),
          }))}
        />
      ) : null}

      {message.role === "assistant" && toolParts.length > 0 ? (
        <WorkspaceAgentToolParts toolParts={toolParts} />
      ) : message.role === "assistant" && !hasPrimaryContent && isStreamingMessage ? (
        <WorkspaceAgentThinkingActivityView steps={[]} live />
      ) : null}

      {questionParts.map((part) => {
        if (isPartStickyDocked(stickyItem, "question", part.data.questionId)) return null;
        const answered = answeredQuestionIds.has(part.data.questionId);
        if (answered) {
          return (
            <AgentStickyArchiveReceiptView
              key={part.id ?? part.data.questionId}
              label="Question answered"
              detail="In history"
            />
          );
        }
        const draft = questionDrafts[part.data.questionId] ?? {
          selectedOptionIds: [] as string[],
          freeText: "",
        };
        const submitting = questionSubmittingId === part.data.questionId;
        const freeText = draft.freeText;
        const selectedOptionIds = draft.selectedOptionIds;
        const canSubmit =
          !answered &&
          !submitting &&
          (part.data.kind === "text"
            ? freeText.trim().length > 0
            : part.data.kind === "single"
              ? selectedOptionIds.length === 1 ||
                (part.data.allowFreeText && freeText.trim().length > 0)
              : selectedOptionIds.length > 0 ||
                (part.data.allowFreeText && freeText.trim().length > 0));
        const selectedLabels = part.data.options
          .filter((option) => selectedOptionIds.includes(option.id))
          .map((option) => option.label);
        return (
          <AgencyQuestionCardView
            key={part.id ?? part.data.questionId}
            question={part.data}
            selectedOptionIds={selectedOptionIds}
            freeText={freeText}
            answered={answered}
            submitting={submitting}
            canSubmit={canSubmit}
            onSelectedOptionIdsChange={(ids) =>
              onQuestionSelectedOptionIdsChange(part.data.questionId, ids)
            }
            onFreeTextChange={(value) => onQuestionFreeTextChange(part.data.questionId, value)}
            onSubmit={() =>
              onAnswerQuestion({
                questionId: part.data.questionId,
                selectedOptionIds,
                selectedLabels,
                freeText: freeText.trim(),
              })
            }
          />
        );
      })}

      {planParts.map((part) => {
        if (isPartStickyDocked(stickyItem, "plan", part.data.planId)) return null;
        if (resolvedPlanIds.has(part.data.planId)) {
          return (
            <AgentStickyArchiveReceiptView
              key={part.id ?? part.data.planId}
              label="Plan confirmed"
              detail={part.data.title}
            />
          );
        }
        return (
          <AgencyPlanCardView
            key={part.id ?? part.data.planId}
            plan={part.data}
            confirming={planConfirmingId === part.data.planId}
            onConfirm={() => onConfirmPlan(part.data)}
          />
        );
      })}

      {proposalParts.map((part) => {
        if (isPartStickyDocked(stickyItem, "proposal", part.data.proposalId)) return null;
        if (resolvedProposalIds.has(part.data.proposalId)) {
          return (
            <AgentStickyArchiveReceiptView
              key={part.id ?? part.data.proposalId}
              label="Proposal resolved"
              detail={part.data.label}
              actionLabel={part.data.boardHref ? "Open on board" : undefined}
              onAction={
                part.data.boardHref && onOpenBoard
                  ? () => onOpenBoard(part.data.boardHref!)
                  : undefined
              }
            />
          );
        }
        return (
          <AgencyProposalCardView
            key={part.id ?? part.data.proposalId}
            proposal={part.data}
            busy={proposalBusyId === part.data.proposalId}
            onApprove={() => onApproveProposal(part.data.proposalId)}
            onReject={() => onRejectProposal(part.data.proposalId)}
          />
        );
      })}

      {messageArtifacts.map((artifact) => {
        if (isPartStickyDocked(stickyItem, "artifact", artifact.id)) return null;
        return (
          <AgentMessageArtifactCardView
            key={artifact.id}
            artifact={artifact}
            onOpen={() => onOpenArtifactCanvas(artifact)}
          />
        );
      })}

      {mapPins.length > 0 ? (
        <MapAnswer pins={mapPins} activeId={mapPins[0]?.id ?? "pin-0"} />
      ) : null}

      {text ? (
        message.role === "user" ? (
          <Bubble variant="secondary" align="end" className="max-w-[min(100%,36rem)]">
            <BubbleContent className="whitespace-pre-wrap text-pretty">{text}</BubbleContent>
          </Bubble>
        ) : (
          <Bubble variant="ghost" className="max-w-[min(100%,36rem)]">
            <BubbleContent className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
              <WorkspaceAgentAssistantTextView text={text} />
              {isStreamingMessage ? (
                <span
                  aria-hidden
                  className="ms-0.5 inline-block h-3.5 w-1 translate-y-px rounded-sm bg-foreground/55 motion-safe:animate-pulse"
                />
              ) : null}
            </BubbleContent>
          </Bubble>
        )
      ) : isStreamingMessage && message.role === "assistant" && toolParts.length === 0 ? (
        <Marker>
          <MarkerContent className="text-muted-foreground">
            <span
              aria-hidden
              className="inline-block text-foreground motion-safe:animate-pulse motion-reduce:animate-none"
            >
              ▍
            </span>
          </MarkerContent>
        </Marker>
      ) : null}

      {message.role === "assistant" &&
      !isStreamingMessage &&
      text.split(/\s+/).filter(Boolean).length > 8 ? (
        <WorkspaceAgentReadAloud text={text} />
      ) : null}
    </>
  );
}

type OrchToolPart = {
  type: "dynamic-tool";
  toolCallId: string;
  toolName: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function isReadSafeTool(name: string): boolean {
  return /^(list_|search_|get_|fetch_)/.test(name);
}

function WorkspaceAgentToolParts({ toolParts }: { toolParts: readonly OrchToolPart[] }) {
  const [open, setOpen] = useState(true);
  const failed = toolParts.filter((part) => part.state === "output-error");

  return (
    <div className="flex max-w-[min(100%,36rem)] flex-col gap-2">
      <ToolGroup
        label="Tools"
        open={open}
        onOpenChange={setOpen}
        tools={toolParts.map((part) => ({
          id: part.toolCallId,
          name: part.toolName,
          target: "",
          state:
            part.state === "output-error"
              ? "failed"
              : part.state === "output-available"
                ? "done"
                : "running",
        }))}
      />
      {failed.map((part) => (
        <ToolError
          key={part.toolCallId}
          name={part.toolName}
          target=""
          message={part.errorText ?? "Tool failed"}
          attempt={1}
          maxAttempts={isReadSafeTool(part.toolName) ? 2 : 1}
          retrying={false}
        />
      ))}
    </div>
  );
}

function WorkspaceAgentReadAloud({ text }: { text: string }) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const [playing, setPlaying] = useState(false);
  const [spokenIndex, setSpokenIndex] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <ReadAloud
      words={words}
      spokenIndex={spokenIndex}
      playing={playing}
      rate={rate}
      elapsed="0:00"
      duration=""
      onToggle={() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        if (playing) {
          window.speechSynthesis.cancel();
          setPlaying(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.onboundary = (event) => {
          if (event.name !== "word") return;
          const prefix = text.slice(0, event.charIndex);
          setSpokenIndex(prefix.split(/\s+/).filter(Boolean).length);
        };
        utterance.onend = () => {
          setPlaying(false);
          setSpokenIndex(words.length);
        };
        utterance.onerror = () => {
          setPlaying(false);
        };
        window.speechSynthesis.speak(utterance);
        setPlaying(true);
        setSpokenIndex(0);
      }}
      onRateChange={() => {
        setRate((current) => (current >= 1.5 ? 0.75 : current + 0.25));
      }}
    />
  );
}
