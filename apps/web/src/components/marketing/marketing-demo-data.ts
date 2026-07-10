import {
  createWorkspaceNode,
  createWorkspaceNodeTab,
  createWorkspaceNotesBlock,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  type WorkspaceNode,
} from "@orch/workspace";
import type { AgentToolCallEntry } from "@orch/agent";

const NOW = "2026-06-15T14:30:00.000Z";

export const marketingWorkspaceNodes: WorkspaceNode[] = (() => {
  const launchNode = createWorkspaceNode({
    id: "marketing-launch",
    title: "Q2 Launch",
    x: 48,
    y: 36,
    width: 300,
    height: 210,
    nodeType: "orchestrator",
    dashboard: { tint: "emerald", featuredBlocks: [] },
    connections: [{ targetNodeId: "marketing-research" }, { targetNodeId: "marketing-ops" }],
    tabs: [
      createWorkspaceNodeTab({
        id: "marketing-launch-tab",
        title: "Overview",
        blocks: [
          createWorkspaceNotesBlock({
            id: "marketing-launch-notes",
            title: "Narrative",
            body: "Ship the Q2 launch without losing trust. Sharp story, fast handoff to sales, zero ambiguity on final stretch.",
          }),
          createWorkspaceTaskListBlock({
            id: "marketing-launch-tasks",
            title: "Critical path",
            tasks: [
              createWorkspaceTask({
                id: "marketing-task-1",
                text: "Lock homepage hero and proof points",
                completed: true,
                priority: "high",
              }),
              createWorkspaceTask({
                id: "marketing-task-2",
                text: "Approve launch email sequence",
                completed: false,
                priority: "high",
              }),
              createWorkspaceTask({
                id: "marketing-task-3",
                text: "Run final dashboard QA pass",
                completed: false,
                priority: "medium",
              }),
            ],
          }),
        ],
      }),
    ],
    createdAt: NOW,
    updatedAt: NOW,
  });

  const researchNode = createWorkspaceNode({
    id: "marketing-research",
    title: "Research",
    x: 400,
    y: 24,
    width: 280,
    height: 200,
    dashboard: { tint: "sky", featuredBlocks: [] },
    tabs: [
      createWorkspaceNodeTab({
        id: "marketing-research-tab",
        title: "Interviews",
        blocks: [
          createWorkspaceNotesBlock({
            id: "marketing-research-notes",
            title: "Synthesis",
            body: "Teams retain when they create a second node. Onboarding should pull toward that moment.",
          }),
        ],
      }),
    ],
    createdAt: NOW,
    updatedAt: NOW,
  });

  const opsNode = createWorkspaceNode({
    id: "marketing-ops",
    title: "Weekly Ops",
    x: 380,
    y: 248,
    width: 280,
    height: 200,
    dashboard: { tint: "amber", featuredBlocks: [] },
    tabs: [
      createWorkspaceNodeTab({
        id: "marketing-ops-tab",
        title: "Review",
        blocks: [
          createWorkspaceTaskListBlock({
            id: "marketing-ops-tasks",
            title: "Follow-through",
            tasks: [
              createWorkspaceTask({
                id: "marketing-ops-task-1",
                text: "Close support backlog over 48h",
                completed: false,
                priority: "high",
              }),
              createWorkspaceTask({
                id: "marketing-ops-task-2",
                text: "Publish agency time report",
                completed: true,
                priority: "medium",
              }),
            ],
          }),
        ],
      }),
    ],
    createdAt: NOW,
    updatedAt: NOW,
  });

  return [launchNode, researchNode, opsNode];
})();

export const marketingAgentToolTraces: AgentToolCallEntry[] = [
  {
    id: "marketing-trace-1",
    name: "get_node_details",
    status: "completed",
    durationMs: 38,
    error: null,
    input: { nodeId: "marketing-launch", detailLevel: "full" },
    output: { title: "Q2 Launch", tabs: 1, blocks: 2, tasksOpen: 2 },
  },
  {
    id: "marketing-trace-2",
    name: "create_block",
    status: "completed",
    durationMs: 112,
    error: null,
    input: {
      nodeId: "marketing-launch",
      tabId: "marketing-launch-tab",
      blockType: "task-list",
      title: "Launch checklist",
    },
    output: { blockId: "blk_launch_checklist", created: true },
  },
  {
    id: "marketing-trace-3",
    name: "search_dashboard",
    status: "in_progress",
    error: null,
    input: { query: "agency time sync", detailLevel: "summary" },
  },
];

export const marketingAgencyRows = [
  {
    id: "marketing-entry-1",
    description: "Sprint planning",
    projectId: "proj-alpha",
    projectName: "Client Alpha",
    clientName: "Northwind",
    startedAt: "2026-06-15T09:15:00.000Z",
    endedAt: "2026-06-15T11:29:00.000Z",
    durationSeconds: 8040,
  },
  {
    id: "marketing-entry-2",
    description: "Roadmap review",
    projectId: "proj-internal",
    projectName: "Internal",
    clientName: "Orch",
    startedAt: "2026-06-15T13:00:00.000Z",
    endedAt: "2026-06-15T14:05:00.000Z",
    durationSeconds: 3900,
  },
  {
    id: "marketing-entry-3",
    description: "Design handoff",
    projectId: "proj-beta",
    projectName: "Client Beta",
    clientName: "Contoso",
    startedAt: "2026-06-15T14:20:00.000Z",
    endedAt: "2026-06-15T15:08:00.000Z",
    durationSeconds: 2880,
  },
] as const;

export const marketingAgencyDayTotalSeconds = marketingAgencyRows.reduce(
  (sum, row) => sum + row.durationSeconds,
  0,
);
