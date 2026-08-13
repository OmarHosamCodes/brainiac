import { createContext, useContext, type ReactNode } from "react";
import type { AiUiArtifact } from "@orch/agent/types";

import {
  EmptyState,
  EmptyStateGreeting,
  EmptyStateSuggestion,
  EmptyStateSuggestions,
} from "@/components/elements/empty-state";
import {
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import type { WorkspaceAgentQuickStart } from "@/features/workspace-agent/workspace-agent-quick-starts";
import type { StickyDockItem } from "@/features/workspace-agent/sticky-dock";

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

export const WorkspaceAgentThreadMessageContext =
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
    <EmptyState className="mx-auto py-6">
      <EmptyStateGreeting className="text-base text-muted-foreground">
        {ctx.emptyHint}
      </EmptyStateGreeting>
      {ctx.quickStarts.length > 0 ? (
        <EmptyStateSuggestions>
          {ctx.quickStarts.map((start, index) => (
            <EmptyStateSuggestion
              key={start.id}
              index={index}
              onClick={() => ctx.onSelectQuickStart(start)}
            >
              {start.label}
            </EmptyStateSuggestion>
          ))}
        </EmptyStateSuggestions>
      ) : null}
    </EmptyState>
  );
}
