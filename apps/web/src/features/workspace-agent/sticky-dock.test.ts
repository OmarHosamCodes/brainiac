import { describe, expect, test } from "bun:test";

import {
  isPartStickyDocked,
  resolveStickyDockItem,
  stickyDockItemKey,
} from "@/features/workspace-agent/sticky-dock";
import type { OrchUIMessage } from "@/features/workspace-agent/orch-ui-message";

function assistant(parts: OrchUIMessage["parts"]): OrchUIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts,
  };
}

describe("resolveStickyDockItem", () => {
  test("prefers unanswered question over later plan and proposal", () => {
    const messages: OrchUIMessage[] = [
      assistant([
        {
          type: "data-orchQuestion",
          id: "q1",
          data: {
            questionId: "q1",
            prompt: "Which range?",
            kind: "single",
            options: [{ id: "a", label: "Week" }],
            allowFreeText: false,
            status: "pending",
            note: "",
          },
        },
        {
          type: "data-orchPlan",
          id: "p1",
          data: {
            planId: "p1",
            title: "Plan",
            summary: "Do things",
            steps: [{ label: "Step", action: {} }],
          },
        },
      ]),
    ];

    const sticky = resolveStickyDockItem({
      messages,
      answeredQuestionIds: new Set(),
      resolvedPlanIds: new Set(),
      resolvedProposalIds: new Set(),
      activeArtifactId: null,
    });

    expect(sticky?.kind).toBe("question");
    if (sticky?.kind === "question") {
      expect(sticky.question.questionId).toBe("q1");
    }
  });

  test("falls through to plan when question answered", () => {
    const messages: OrchUIMessage[] = [
      assistant([
        {
          type: "data-orchQuestion",
          id: "q1",
          data: {
            questionId: "q1",
            prompt: "Which range?",
            kind: "single",
            options: [{ id: "a", label: "Week" }],
            allowFreeText: false,
            status: "pending",
            note: "",
          },
        },
        {
          type: "data-orchPlan",
          id: "p1",
          data: {
            planId: "p1",
            title: "Plan",
            summary: "Do things",
            steps: [{ label: "Step", action: {} }],
          },
        },
      ]),
    ];

    const sticky = resolveStickyDockItem({
      messages,
      answeredQuestionIds: new Set(["q1"]),
      resolvedPlanIds: new Set(),
      resolvedProposalIds: new Set(),
      activeArtifactId: null,
    });

    expect(sticky?.kind).toBe("plan");
  });

  test("skips artifact already open in the pane", () => {
    const artifact = {
      id: "art-1",
      title: "Report",
      kind: "schema" as const,
      schema: { type: "doc" as const, children: [] },
    };
    const messages: OrchUIMessage[] = [
      assistant([{ type: "data-orchArtifact", id: "art-1", data: artifact }]),
    ];

    expect(
      resolveStickyDockItem({
        messages,
        answeredQuestionIds: new Set(),
        resolvedPlanIds: new Set(),
        resolvedProposalIds: new Set(),
        activeArtifactId: "art-1",
      }),
    ).toBeNull();

    const sticky = resolveStickyDockItem({
      messages,
      answeredQuestionIds: new Set(),
      resolvedPlanIds: new Set(),
      resolvedProposalIds: new Set(),
      activeArtifactId: null,
    });
    expect(sticky?.kind).toBe("artifact");
  });

  test("stickyDockItemKey and isPartStickyDocked", () => {
    const item = {
      kind: "proposal" as const,
      proposal: {
        proposalId: "pr1",
        status: "pending" as const,
        label: "Edit entry",
        action: {},
        before: {},
        after: {},
      },
    };
    expect(stickyDockItemKey(item)).toBe("proposal:pr1");
    expect(isPartStickyDocked(item, "proposal", "pr1")).toBe(true);
    expect(isPartStickyDocked(item, "proposal", "other")).toBe(false);
    expect(isPartStickyDocked(item, "plan", "pr1")).toBe(false);
  });
});
