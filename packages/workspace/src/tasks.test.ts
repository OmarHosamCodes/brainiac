import { describe, expect, test } from "bun:test";

import {
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_QUADRANTS,
  buildEisenhowerBattlePlanPromptFromTasks,
  collectWorkspaceNodeTasks,
  createWorkspaceContentPipelineBlock,
  createWorkspaceContentPipelineItem,
  createWorkspaceEisenhowerMatrixBlock,
  createWorkspaceNode,
  createWorkspaceNodeTab,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  filterCollectedTasksByTimeOrchestratorSettings,
  getEisenhowerMatrixSummary,
  getEisenhowerMatrixSummaryFromTasks,
  normalizeWorkspaceBlock,
} from "./index";

describe("eisenhower matrix orchestration", () => {
  test("normalizes existing matrix blocks with default settings", () => {
    const timestamp = "2026-04-13T09:00:00.000Z";
    const normalized = normalizeWorkspaceBlock({
      id: "block-1",
      type: "eisenhower-matrix",
      title: "Priority matrix",
      tasks: [],
      latestBattlePlan: "",
      battlePlanUpdatedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as any);

    expect(normalized.type).toBe("eisenhower-matrix");
    if (normalized.type !== "eisenhower-matrix") {
      throw new Error("Expected an Eisenhower matrix block.");
    }

    expect(normalized.settings.domains).toEqual([...WORKSPACE_TASK_DOMAINS]);
    expect(normalized.settings.includeUnassigned).toBe(true);
    expect(normalized.settings.quadrants).toEqual([...WORKSPACE_TASK_QUADRANTS]);
  });

  test("collects orchestrator-scoped tasks across task, matrix, and content pipeline sources", () => {
    const orchestratorBlock = createWorkspaceEisenhowerMatrixBlock({
      title: "Priority matrix",
      tasks: [
        createWorkspaceTask({
          text: "Review founder agenda",
          domain: "orchestrator",
          urgency: 9,
          importance: 9,
          estimateMinutes: 30,
        }),
      ],
    });
    const salesNode = createWorkspaceNode({
      title: "Sales Ops",
      tabs: [
        createWorkspaceNodeTab({
          title: "Pipeline",
          blocks: [
            createWorkspaceTaskListBlock({
              title: "Sales follow-ups",
              tasks: [
                createWorkspaceTask({
                  text: "Close renewal follow-up",
                  domain: "sales",
                  urgency: 8,
                  importance: 8,
                  estimateMinutes: 45,
                }),
              ],
            }),
          ],
        }),
      ],
    });
    const peopleNode = createWorkspaceNode({
      title: "People Hub",
      tabs: [
        createWorkspaceNodeTab({
          title: "Hiring",
          blocks: [
            createWorkspaceEisenhowerMatrixBlock({
              title: "People matrix",
              tasks: [
                createWorkspaceTask({
                  text: "Review scorecards",
                  domain: "people",
                  urgency: 5,
                  importance: 8,
                  estimateMinutes: 60,
                }),
              ],
            }),
          ],
        }),
      ],
    });
    const contentNode = createWorkspaceNode({
      title: "Content Studio",
      tabs: [
        createWorkspaceNodeTab({
          title: "Editorial",
          blocks: [
            createWorkspaceContentPipelineBlock({
              title: "Editorial queue",
              items: [
                createWorkspaceContentPipelineItem({
                  title: "Ship newsletter",
                  status: "review",
                }),
              ],
            }),
          ],
        }),
      ],
    });
    const orchestratorNode = createWorkspaceNode({
      title: "CEO OS",
      nodeType: "orchestrator",
      tabs: [
        createWorkspaceNodeTab({
          title: "Control",
          blocks: [orchestratorBlock],
        }),
      ],
      connections: [
        { targetNodeId: salesNode.id },
        { targetNodeId: peopleNode.id },
        { targetNodeId: contentNode.id },
      ],
    });

    const scopedTasks = filterCollectedTasksByTimeOrchestratorSettings(
      collectWorkspaceNodeTasks(orchestratorNode, [
        orchestratorNode,
        salesNode,
        peopleNode,
        contentNode,
      ]),
      orchestratorBlock.settings,
    );
    const summary = getEisenhowerMatrixSummaryFromTasks(scopedTasks);

    expect(scopedTasks).toHaveLength(4);
    expect(new Set(scopedTasks.map((item) => item.blockType))).toEqual(
      new Set(["eisenhower-matrix", "task-list", "content-pipeline"]),
    );
    expect(summary.totalTaskCount).toBe(4);
    expect(summary.quadrants.do.taskCount).toBe(3);
    expect(summary.quadrants.schedule.taskCount).toBe(1);
    expect(
      summary.prioritizedTasks.some(
        (item) =>
          item.blockType === "content-pipeline" &&
          item.sourceNodeTitle === "Content Studio" &&
          item.task.text === "Ship newsletter",
      ),
    ).toBe(true);
  });

  test("applies matrix settings to local summaries and filtered battle-plan prompts", () => {
    const block = createWorkspaceEisenhowerMatrixBlock({
      title: "Filtered matrix",
      settings: {
        domains: ["content"],
        includeUnassigned: false,
        quadrants: ["do"],
      },
      tasks: [
        createWorkspaceTask({
          text: "Ship newsletter",
          domain: "content",
          urgency: 9,
          importance: 8,
          estimateMinutes: 30,
        }),
        createWorkspaceTask({
          text: "Review scorecards",
          domain: "people",
          urgency: 5,
          importance: 8,
          estimateMinutes: 60,
        }),
      ],
    });

    const summary = getEisenhowerMatrixSummary(block);
    const prompt = buildEisenhowerBattlePlanPromptFromTasks(summary.prioritizedTasks);

    expect(summary.totalTaskCount).toBe(1);
    expect(summary.prioritizedTasks.map((item) => item.task.text)).toEqual(["Ship newsletter"]);
    expect(prompt).toContain("Ship newsletter");
    expect(prompt).toContain("domain Content");
    expect(prompt).toContain("Filtered matrix");
  });
});
