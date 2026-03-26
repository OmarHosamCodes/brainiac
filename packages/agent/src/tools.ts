import { tool } from "@openrouter/sdk";
import type { WorkspaceBlock, WorkspaceNode, WorkspaceNodeTab } from "@brainiac/workspace";
import { z } from "zod";

type DashboardSearchMatch = {
  nodeId: string;
  nodeTitle: string;
  source: string;
  excerpt: string;
  score: number;
};

const listDashboardNodesOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      label: z.string().nullable(),
      contentPreview: z.string(),
      tabsCount: z.number().int().nonnegative(),
      blockTypes: z.array(z.string()),
    }),
  ),
});

const searchDashboardOutputSchema = z.object({
  matches: z.array(
    z.object({
      nodeId: z.string(),
      nodeTitle: z.string(),
      source: z.string(),
      excerpt: z.string(),
      score: z.number(),
    }),
  ),
});

const getNodeDetailsOutputSchema = z.object({
  node: z
    .object({
      id: z.string(),
      title: z.string(),
      label: z.string().nullable(),
      content: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      size: z.object({
        width: z.number(),
        height: z.number(),
      }),
      tabs: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          blockCount: z.number().int().nonnegative(),
          blocks: z.array(
            z.object({
              id: z.string(),
              type: z.string(),
              title: z.string(),
              summary: z.string(),
            }),
          ),
        }),
      ),
    })
    .nullable(),
});

function truncate(value: string, length = 240) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function summarizeBlock(block: WorkspaceBlock) {
  switch (block.type) {
    case "task-list":
      return `${block.tasks.length} tasks, ${block.tasks.filter((task) => task.completed).length} completed`;
    case "notes":
      return truncate(block.body || "Empty notes block");
    case "decision":
      return `${block.pros.length} pros, ${block.cons.length} cons`;
    case "tracker":
      return `${block.entries.length} tracker entries`;
    case "ai-prompt":
      return truncate(block.latestOutput || block.prompt || "No prompt output yet");
    case "time-orchestrator":
      return `${block.settings.domains.length} domains across ${block.settings.quadrants.length} quadrants`;
    case "kanban":
      return `${block.columns.length} columns, ${block.cards.length} cards`;
    case "timeline":
      return `${block.milestones.length} milestones`;
    case "scorecard":
      return `${block.metrics.length} metrics`;
    case "custom":
      return truncate(block.notes || block.latestAiOutput || JSON.stringify(block.values));
    default:
      return "Workspace block";
  }
}

function getNodeBlockTypes(node: WorkspaceNode) {
  return [...new Set(node.tabs.flatMap((tab) => tab.blocks.map((block) => block.type)))];
}

function describeTab(tab: WorkspaceNodeTab) {
  return {
    id: tab.id,
    title: tab.title,
    blockCount: tab.blocks.length,
    blocks: tab.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      title: block.title,
      summary: summarizeBlock(block),
    })),
  };
}

function createSearchEntries(nodes: WorkspaceNode[]) {
  return nodes.flatMap((node) => {
    const entries = [
      {
        nodeId: node.id,
        nodeTitle: node.title,
        source: "node",
        text: `${node.title}\n${node.label ?? ""}\n${node.content}`,
      },
    ];

    for (const tab of node.tabs) {
      entries.push({
        nodeId: node.id,
        nodeTitle: node.title,
        source: `tab:${tab.title}`,
        text: `${tab.title}\n${tab.blocks
          .map((block) => `${block.title}\n${summarizeBlock(block)}`)
          .join("\n")}`,
      });

      for (const block of tab.blocks) {
        entries.push({
          nodeId: node.id,
          nodeTitle: node.title,
          source: `block:${block.title}`,
          text: `${block.title}\n${summarizeBlock(block)}`,
        });
      }
    }

    return entries;
  });
}

function scoreSearchMatch(query: string, text: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedText = text.toLowerCase();

  if (!normalizedQuery || !normalizedText.includes(normalizedQuery)) {
    return 0;
  }

  const exactMatches = normalizedText.split(normalizedQuery).length - 1;
  const startsWithBoost = normalizedText.startsWith(normalizedQuery) ? 2 : 0;

  return exactMatches * 3 + startsWithBoost + Math.max(1, 12 - normalizedText.indexOf(normalizedQuery));
}

function searchWorkspace(nodes: WorkspaceNode[], query: string, limit: number): DashboardSearchMatch[] {
  return createSearchEntries(nodes)
    .map((entry) => {
      const score = scoreSearchMatch(query, entry.text);

      return {
        nodeId: entry.nodeId,
        nodeTitle: entry.nodeTitle,
        source: entry.source,
        excerpt: truncate(entry.text, 260),
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function buildWorkspaceOverview(nodes: WorkspaceNode[]) {
  if (nodes.length === 0) {
    return "The dashboard is currently empty.";
  }

  return nodes
    .slice(0, 10)
    .map((node, index) => {
      const blockCount = node.tabs.reduce((total, tab) => total + tab.blocks.length, 0);
      const blockTypes = getNodeBlockTypes(node).join(", ") || "no blocks";

      return `${index + 1}. ${node.title} (${node.tabs.length} tabs, ${blockCount} blocks, ${blockTypes})`;
    })
    .join("\n");
}

export function buildDashboardAgentTools(nodes: WorkspaceNode[]) {
  return [
    tool({
      name: "list_dashboard_nodes",
      description: "List the current dashboard nodes with structural summaries.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      outputSchema: listDashboardNodesOutputSchema,
      execute: async ({ limit }) => ({
        nodes: nodes.slice(0, limit).map((node) => ({
          id: node.id,
          title: node.title,
          label: node.label ?? null,
          contentPreview: truncate(node.content || "No description yet"),
          tabsCount: node.tabs.length,
          blockTypes: getNodeBlockTypes(node),
        })),
      }),
    }),
    tool({
      name: "search_dashboard",
      description: "Search node titles, descriptions, tabs, and block summaries in the current dashboard.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      outputSchema: searchDashboardOutputSchema,
      execute: async ({ query, limit }) => ({
        matches: searchWorkspace(nodes, query, limit),
      }),
    }),
    tool({
      name: "get_node_details",
      description: "Inspect a single dashboard node in detail, including tabs and block summaries.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
      }),
      outputSchema: getNodeDetailsOutputSchema,
      execute: async ({ nodeId }) => {
        const node = nodes.find((item) => item.id === nodeId) ?? null;

        return {
          node: node
            ? {
                id: node.id,
                title: node.title,
                label: node.label ?? null,
                content: node.content,
                position: {
                  x: node.x,
                  y: node.y,
                },
                size: {
                  width: node.width,
                  height: node.height,
                },
                tabs: node.tabs.map(describeTab),
              }
            : null,
        };
      },
    }),
    tool({
      name: "get_current_time",
      description: "Get the current ISO timestamp for time-sensitive planning questions.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        iso: z.string(),
      }),
      execute: async () => ({
        iso: new Date().toISOString(),
      }),
    }),
  ];
}
