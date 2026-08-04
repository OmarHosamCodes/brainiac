import type { AiUiArtifact } from "@orch/agent/types";

import {
  getMessageArtifacts,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";

export type StickyDockItem =
  | { kind: "question"; question: OrchUIDataParts["orchQuestion"] }
  | { kind: "plan"; plan: OrchUIDataParts["orchPlan"] }
  | { kind: "proposal"; proposal: OrchUIDataParts["orchProposal"] }
  | { kind: "artifact"; artifact: AiUiArtifact };

export type StickyDockResolveInput = {
  messages: OrchUIMessage[];
  answeredQuestionIds: ReadonlySet<string>;
  resolvedPlanIds: ReadonlySet<string>;
  resolvedProposalIds: ReadonlySet<string>;
  /** When the docked pane already shows this artifact, do not stick a canvas chip. */
  activeArtifactId: string | null;
};

/**
 * Cursor-like sticky priority: question > plan > proposal > canvas.
 * Within a kind, the latest occurrence in the transcript wins.
 * Dismissed keys stay in the stream (not docked) until resolved.
 */
export function resolveStickyDockItem(
  input: StickyDockResolveInput & { dismissedStickyKeys?: ReadonlySet<string> },
): StickyDockItem | null {
  let question: OrchUIDataParts["orchQuestion"] | null = null;
  let plan: OrchUIDataParts["orchPlan"] | null = null;
  let proposal: OrchUIDataParts["orchProposal"] | null = null;
  let artifact: AiUiArtifact | null = null;
  const dismissed = input.dismissedStickyKeys ?? new Set<string>();

  for (const message of input.messages) {
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (part.type === "data-orchQuestion") {
        if (
          !input.answeredQuestionIds.has(part.data.questionId) &&
          !dismissed.has(`question:${part.data.questionId}`)
        ) {
          question = part.data;
        }
      } else if (part.type === "data-orchPlan") {
        if (
          !input.resolvedPlanIds.has(part.data.planId) &&
          !dismissed.has(`plan:${part.data.planId}`)
        ) {
          plan = part.data;
        }
      } else if (part.type === "data-orchProposal") {
        if (
          !input.resolvedProposalIds.has(part.data.proposalId) &&
          !dismissed.has(`proposal:${part.data.proposalId}`)
        ) {
          proposal = part.data;
        }
      }
    }

    for (const messageArtifact of getMessageArtifacts(message)) {
      if (
        messageArtifact.id !== input.activeArtifactId &&
        !dismissed.has(`artifact:${messageArtifact.id}`)
      ) {
        artifact = messageArtifact;
      }
    }
  }

  if (question) return { kind: "question", question };
  if (plan) return { kind: "plan", plan };
  if (proposal) return { kind: "proposal", proposal };
  if (artifact) return { kind: "artifact", artifact };
  return null;
}

export function stickyDockItemKey(item: StickyDockItem): string {
  switch (item.kind) {
    case "question":
      return `question:${item.question.questionId}`;
    case "plan":
      return `plan:${item.plan.planId}`;
    case "proposal":
      return `proposal:${item.proposal.proposalId}`;
    case "artifact":
      return `artifact:${item.artifact.id}`;
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

/** True when this actionable part is currently hosted in the sticky dock (hide inline duplicate). */
export function isPartStickyDocked(
  item: StickyDockItem | null,
  kind: StickyDockItem["kind"],
  id: string,
): boolean {
  if (!item || item.kind !== kind) return false;
  switch (item.kind) {
    case "question":
      return kind === "question" && item.question.questionId === id;
    case "plan":
      return kind === "plan" && item.plan.planId === id;
    case "proposal":
      return kind === "proposal" && item.proposal.proposalId === id;
    case "artifact":
      return kind === "artifact" && item.artifact.id === id;
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}
