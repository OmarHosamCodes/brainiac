import { tool } from "@openrouter/sdk";
import {
  cloneWorkspaceNodes,
  createDefaultWorkspaceTab,
  createWorkspaceAiPromptBlock,
  createWorkspaceCustomBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceKanbanBlock,
  createWorkspaceNode,
  createWorkspaceNotesBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceTaskListBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTrackerBlock,
  workspaceBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceMarketplaceItemSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeTintSchema,
  type WorkspaceBlock,
  type WorkspaceCustomBlockTemplate,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
  type WorkspaceNodeTab,
} from "@brainiac/workspace";
import { z } from "zod";

type DashboardSearchMatch = {
  nodeId: string;
  nodeTitle: string;
  source: string;
  excerpt: string;
  score: number;
};

type MarketplaceSearchMatch = {
  itemId: string;
  title: string;
  kind: WorkspaceMarketplaceItem["payload"]["kind"];
  excerpt: string;
  score: number;
};

const workspaceBlockTypeSchema = z.enum([
  "task-list",
  "notes",
  "decision",
  "tracker",
  "ai-prompt",
  "time-orchestrator",
  "kanban",
  "timeline",
  "scorecard",
  "custom",
]);

const nodeReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  label: z.string().nullable(),
});

const nodeSummarySchema = nodeReferenceSchema.extend({
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
});

const mutationMetaSchema = z.object({
  updatedAt: z.string().datetime().nullable(),
  nodeCount: z.number().int().nonnegative(),
});

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

const listMarketplaceItemsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      kind: z.enum(["node", "tab", "block"]),
      createdByName: z.string(),
      updatedAt: z.string().datetime(),
    }),
  ),
});

const searchMarketplaceOutputSchema = z.object({
  matches: z.array(
    z.object({
      itemId: z.string(),
      title: z.string(),
      kind: z.enum(["node", "tab", "block"]),
      excerpt: z.string(),
      score: z.number(),
    }),
  ),
});

const getNodeDetailsOutputSchema = z.object({
  node: workspaceNodeSchema.nullable(),
  summary: nodeSummarySchema.nullable(),
});

const getTabDetailsOutputSchema = z.object({
  node: nodeReferenceSchema.nullable(),
  tab: workspaceNodeTabSchema.nullable(),
  customBlockTemplates: z.array(workspaceCustomBlockTemplateSchema),
});

const getBlockDetailsOutputSchema = z.object({
  node: nodeReferenceSchema.nullable(),
  tab: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .nullable(),
  block: workspaceBlockSchema.nullable(),
  customBlockTemplate: workspaceCustomBlockTemplateSchema.nullable(),
});

const getMarketplaceItemDetailsOutputSchema = z.object({
  item: workspaceMarketplaceItemSchema.nullable(),
});

const nodeMutationOutputSchema = mutationMetaSchema.extend({
  node: workspaceNodeSchema,
});

const deleteNodeOutputSchema = mutationMetaSchema.extend({
  deleted: z.literal(true),
  nodeId: z.string(),
  title: z.string(),
});

const tabMutationOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tab: workspaceNodeTabSchema,
});

const deleteTabOutputSchema = mutationMetaSchema.extend({
  node: workspaceNodeSchema,
  deletedTabId: z.string(),
  deletedTabTitle: z.string(),
});

const blockMutationOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tab: workspaceNodeTabSchema,
  block: workspaceBlockSchema,
  customBlockTemplate: workspaceCustomBlockTemplateSchema.nullable(),
});

const deleteBlockOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tab: workspaceNodeTabSchema,
  deletedBlockId: z.string(),
  deletedBlockTitle: z.string(),
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

function describeNodeReference(node: WorkspaceNode) {
  return {
    id: node.id,
    title: node.title,
    label: node.label ?? null,
  };
}

function describeTabSummary(tab: WorkspaceNodeTab) {
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

function describeNodeSummary(node: WorkspaceNode) {
  return {
    ...describeNodeReference(node),
    content: node.content,
    position: {
      x: node.x,
      y: node.y,
    },
    size: {
      width: node.width,
      height: node.height,
    },
    tabs: node.tabs.map(describeTabSummary),
  };
}

function getBlockTemplateIds(block: WorkspaceBlock) {
  if (block.type !== "custom") {
    return [];
  }

  return [block.definitionId];
}

function getTabTemplateIds(tab: WorkspaceNodeTab) {
  return [...new Set(tab.blocks.flatMap((block) => getBlockTemplateIds(block)))];
}

function getTemplatesByIds(node: WorkspaceNode, ids: string[]): WorkspaceCustomBlockTemplate[] {
  if (ids.length === 0) {
    return [];
  }

  const idSet = new Set(ids);
  return node.customBlockTemplates.filter((template) => idSet.has(template.id));
}

function findNode(nodes: WorkspaceNode[], nodeId: string) {
  return nodes.find((item) => item.id === nodeId) ?? null;
}

function findTab(nodes: WorkspaceNode[], nodeId: string, tabId: string) {
  const node = findNode(nodes, nodeId);
  const tab = node?.tabs.find((item) => item.id === tabId) ?? null;

  return {
    node,
    tab,
  };
}

function findBlock(
  nodes: WorkspaceNode[],
  args: { nodeId?: string; tabId?: string; blockId: string },
) {
  if (args.nodeId) {
    const node = findNode(nodes, args.nodeId);

    if (!node) {
      return {
        node: null,
        tab: null,
        block: null,
      };
    }

    const tabs = args.tabId ? node.tabs.filter((item) => item.id === args.tabId) : node.tabs;

    for (const tab of tabs) {
      const block = tab.blocks.find((item) => item.id === args.blockId);

      if (block) {
        return {
          node,
          tab,
          block,
        };
      }
    }

    return {
      node,
      tab: null,
      block: null,
    };
  }

  for (const node of nodes) {
    for (const tab of node.tabs) {
      if (args.tabId && tab.id !== args.tabId) {
        continue;
      }

      const block = tab.blocks.find((item) => item.id === args.blockId);

      if (block) {
        return {
          node,
          tab,
          block,
        };
      }
    }
  }

  return {
    node: null,
    tab: null,
    block: null,
  };
}

function requireNode(nodes: WorkspaceNode[], nodeId: string) {
  const node = findNode(nodes, nodeId);

  if (!node) {
    throw new Error(`Node "${nodeId}" was not found.`);
  }

  return node;
}

function requireTab(nodes: WorkspaceNode[], nodeId: string, tabId: string) {
  const { node, tab } = findTab(nodes, nodeId, tabId);

  if (!node) {
    throw new Error(`Node "${nodeId}" was not found.`);
  }

  if (!tab) {
    throw new Error(`Tab "${tabId}" was not found in node "${node.title}".`);
  }

  return {
    node,
    tab,
  };
}

function requireBlock(nodes: WorkspaceNode[], nodeId: string, tabId: string, blockId: string) {
  const { node, tab, block } = findBlock(nodes, {
    nodeId,
    tabId,
    blockId,
  });

  if (!node) {
    throw new Error(`Node "${nodeId}" was not found.`);
  }

  if (!tab) {
    throw new Error(`Tab "${tabId}" was not found in node "${node.title}".`);
  }

  if (!block) {
    throw new Error(`Block "${blockId}" was not found.`);
  }

  return {
    node,
    tab,
    block,
  };
}

function getMissingCustomTemplateIds(node: WorkspaceNode, blocks: WorkspaceBlock[]) {
  const knownTemplateIds = new Set(node.customBlockTemplates.map((template) => template.id));

  return [...new Set(blocks.flatMap((block) => {
    if (block.type !== "custom" || knownTemplateIds.has(block.definitionId)) {
      return [];
    }

    return [block.definitionId];
  }))];
}

function assertBlocksUseKnownCustomTemplates(node: WorkspaceNode, blocks: WorkspaceBlock[]) {
  const missingTemplateIds = getMissingCustomTemplateIds(node, blocks);

  if (missingTemplateIds.length === 0) {
    return;
  }

  throw new Error(
    `Unknown custom block template id${missingTemplateIds.length === 1 ? "" : "s"}: ${missingTemplateIds.join(", ")}.`,
  );
}

function assertNodeUsesKnownCustomTemplates(node: WorkspaceNode) {
  assertBlocksUseKnownCustomTemplates(
    node,
    node.tabs.flatMap((tab) => tab.blocks),
  );
}

function getSuggestedNodePosition(nodes: WorkspaceNode[]) {
  const lastNode = nodes.at(-1);

  if (!lastNode) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: lastNode.x + 48,
    y: lastNode.y + 48,
  };
}

function getCustomBlockTemplateForBlock(node: WorkspaceNode, block: WorkspaceBlock) {
  if (block.type !== "custom") {
    return null;
  }

  return node.customBlockTemplates.find((template) => template.id === block.definitionId) ?? null;
}

function createBlockByType(args: {
  node: WorkspaceNode;
  type: z.infer<typeof workspaceBlockTypeSchema>;
  title?: string;
  customTemplateId?: string;
}) {
  const trimmedTitle = args.title?.trim();
  const titleInput = trimmedTitle ? { title: trimmedTitle } : {};

  switch (args.type) {
    case "task-list":
      return createWorkspaceTaskListBlock(titleInput);
    case "notes":
      return createWorkspaceNotesBlock(titleInput);
    case "decision":
      return createWorkspaceDecisionBlock(titleInput);
    case "tracker":
      return createWorkspaceTrackerBlock(titleInput);
    case "ai-prompt":
      return createWorkspaceAiPromptBlock(titleInput);
    case "time-orchestrator":
      return createWorkspaceTimeOrchestratorBlock(titleInput);
    case "kanban":
      return createWorkspaceKanbanBlock(titleInput);
    case "timeline":
      return createWorkspaceTimelineBlock(titleInput);
    case "scorecard":
      return createWorkspaceScorecardBlock(titleInput);
    case "custom": {
      if (!args.customTemplateId) {
        throw new Error("A customTemplateId is required when creating a custom block.");
      }

      const template = args.node.customBlockTemplates.find(
        (entry) => entry.id === args.customTemplateId,
      );

      if (!template) {
        throw new Error(`Custom template "${args.customTemplateId}" was not found.`);
      }

      return createWorkspaceCustomBlock(template, titleInput);
    }
    default:
      throw new Error(`Unsupported block type "${args.type}".`);
  }
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

  return (
    exactMatches * 3 + startsWithBoost + Math.max(1, 12 - normalizedText.indexOf(normalizedQuery))
  );
}

function searchWorkspace(
  nodes: WorkspaceNode[],
  query: string,
  limit: number,
): DashboardSearchMatch[] {
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

function createMarketplaceSearchEntries(items: WorkspaceMarketplaceItem[]) {
  return items.map((item) => {
    const payloadLabel =
      item.payload.kind === "node"
        ? `${item.payload.node.title}\n${item.payload.node.content}`
        : item.payload.kind === "tab"
          ? `${item.payload.tab.title}\n${item.payload.tab.blocks.map((block) => block.title).join("\n")}`
          : `${item.payload.block.title}\n${summarizeBlock(item.payload.block)}`;

    return {
      itemId: item.id,
      title: item.title,
      kind: item.payload.kind,
      text: `${item.title}\n${item.summary}\n${item.payload.kind}\n${payloadLabel}`,
    };
  });
}

function searchMarketplace(
  items: WorkspaceMarketplaceItem[],
  query: string,
  limit: number,
): MarketplaceSearchMatch[] {
  return createMarketplaceSearchEntries(items)
    .map((entry) => {
      const score = scoreSearchMatch(query, entry.text);

      return {
        itemId: entry.itemId,
        title: entry.title,
        kind: entry.kind,
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

export function createDashboardAgentWorkspaceRuntime(args: {
  nodes: WorkspaceNode[];
  updatedAt?: string | null;
}) {
  let currentNodes = cloneWorkspaceNodes(args.nodes);
  let currentUpdatedAt = args.updatedAt ?? null;
  let changed = false;

  return {
    getNodes() {
      return currentNodes;
    },
    getUpdatedAt() {
      return currentUpdatedAt;
    },
    hasChanges() {
      return changed;
    },
    toSnapshot() {
      return {
        nodes: cloneWorkspaceNodes(currentNodes),
        updatedAt: currentUpdatedAt,
      };
    },
    async applyMutation<TResult>(
      mutator: (draft: WorkspaceNode[], timestamp: string) => TResult | Promise<TResult>,
    ) {
      const draft = cloneWorkspaceNodes(currentNodes);
      const timestamp = new Date().toISOString();
      const result = await mutator(draft, timestamp);

      currentNodes = cloneWorkspaceNodes(draft);
      currentUpdatedAt = timestamp;
      changed = true;

      return {
        result,
        updatedAt: currentUpdatedAt,
        nodeCount: currentNodes.length,
      };
    },
  };
}

export type DashboardAgentWorkspaceRuntime = ReturnType<
  typeof createDashboardAgentWorkspaceRuntime
>;

export function buildDashboardAgentTools(
  workspace: DashboardAgentWorkspaceRuntime,
  marketplaceItems: WorkspaceMarketplaceItem[] = [],
) {
  return [
    tool({
      name: "list_dashboard_nodes",
      description: "List the current dashboard nodes with structural summaries.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      outputSchema: listDashboardNodesOutputSchema,
      execute: async ({ limit }) => ({
        nodes: workspace.getNodes().slice(0, limit).map((node) => ({
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
      description:
        "Search node titles, descriptions, tabs, and block summaries in the current dashboard.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      outputSchema: searchDashboardOutputSchema,
      execute: async ({ query, limit }) => ({
        matches: searchWorkspace(workspace.getNodes(), query, limit),
      }),
    }),
    tool({
      name: "list_marketplace_items",
      description: "List marketplace items available for reuse with their payload kinds.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      outputSchema: listMarketplaceItemsOutputSchema,
      execute: async ({ limit }) => ({
        items: marketplaceItems.slice(0, limit).map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          kind: item.payload.kind,
          createdByName: item.createdByName,
          updatedAt: item.updatedAt,
        })),
      }),
    }),
    tool({
      name: "search_marketplace",
      description: "Search marketplace item titles, summaries, and payload content.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      outputSchema: searchMarketplaceOutputSchema,
      execute: async ({ query, limit }) => ({
        matches: searchMarketplace(marketplaceItems, query, limit),
      }),
    }),
    tool({
      name: "get_node_details",
      description:
        "Inspect a single dashboard node with its full raw data and a lighter summary for fast review.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
      }),
      outputSchema: getNodeDetailsOutputSchema,
      execute: async ({ nodeId }) => {
        const node = findNode(workspace.getNodes(), nodeId);

        return {
          node,
          summary: node ? describeNodeSummary(node) : null,
        };
      },
    }),
    tool({
      name: "get_tab_details",
      description:
        "Inspect a single dashboard tab with its full raw block data and related custom templates.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        tabId: z.string().trim().min(1),
      }),
      outputSchema: getTabDetailsOutputSchema,
      execute: async ({ nodeId, tabId }) => {
        const { node, tab } = findTab(workspace.getNodes(), nodeId, tabId);

        return {
          node: node ? describeNodeReference(node) : null,
          tab,
          customBlockTemplates: node && tab ? getTemplatesByIds(node, getTabTemplateIds(tab)) : [],
        };
      },
    }),
    tool({
      name: "get_block_details",
      description:
        "Inspect a single dashboard block with full raw data. Optionally constrain by node or tab when ids are known.",
      inputSchema: z.object({
        blockId: z.string().trim().min(1),
        nodeId: z.string().trim().min(1).optional(),
        tabId: z.string().trim().min(1).optional(),
      }),
      outputSchema: getBlockDetailsOutputSchema,
      execute: async ({ blockId, nodeId, tabId }) => {
        const { node, tab, block } = findBlock(workspace.getNodes(), { blockId, nodeId, tabId });
        const customBlockTemplate =
          node && block ? getCustomBlockTemplateForBlock(node, block) : null;

        return {
          node: node ? describeNodeReference(node) : null,
          tab: tab
            ? {
                id: tab.id,
                title: tab.title,
              }
            : null,
          block,
          customBlockTemplate,
        };
      },
    }),
    tool({
      name: "create_node",
      description:
        "Create a new dashboard node with a default overview tab. Use this when the user asks to add a node.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(120),
        content: z.string().max(4000).optional(),
        x: z.number().finite().optional(),
        y: z.number().finite().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        tint: workspaceNodeTintSchema.optional(),
        overviewTabTitle: z.string().trim().min(1).max(80).optional(),
      }),
      outputSchema: nodeMutationOutputSchema,
      execute: async ({ title, content, x, y, width, height, tint, overviewTabTitle }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft) => {
          const suggestedPosition = getSuggestedNodePosition(draft);
          const trimmedContent = content?.trim() ?? "";
          const node = createWorkspaceNode({
            title,
            content: trimmedContent,
            x: x ?? suggestedPosition.x,
            y: y ?? suggestedPosition.y,
            width,
            height,
            tabs: overviewTabTitle
              ? [createDefaultWorkspaceTab(overviewTabTitle, trimmedContent)]
              : undefined,
            dashboard: tint
              ? {
                  tint,
                  featuredBlocks: [],
                }
              : undefined,
          });

          draft.push(node);

          return {
            nodeId: node.id,
          };
        });
        const node = requireNode(workspace.getNodes(), result.nodeId);

        return {
          node,
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "replace_node",
      description:
        "Replace a node with a full raw node payload. Use get_node_details first, edit the raw node, then call this tool.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        node: workspaceNodeSchema,
      }),
      outputSchema: nodeMutationOutputSchema,
      execute: async ({ nodeId, node }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const currentNode = requireNode(draft, nodeId);
          const currentIndex = draft.findIndex((entry) => entry.id === nodeId);
          const nextNode = createWorkspaceNode({
            ...node,
            id: currentNode.id,
            createdAt: currentNode.createdAt,
            updatedAt: timestamp,
          });

          assertNodeUsesKnownCustomTemplates(nextNode);
          draft[currentIndex] = nextNode;

          return {
            nodeId: nextNode.id,
          };
        });
        const nextNode = requireNode(workspace.getNodes(), result.nodeId);

        return {
          node: nextNode,
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "delete_node",
      description: "Delete a dashboard node by id.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
      }),
      outputSchema: deleteNodeOutputSchema,
      execute: async (input) => {
        const { nodeId } = input;
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft) => {
          const node = requireNode(draft, nodeId);
          const currentIndex = draft.findIndex((entry) => entry.id === node.id);

          draft.splice(currentIndex, 1);

          return {
            nodeId: node.id,
            title: node.title,
          };
        });

        return deleteNodeOutputSchema.parse({
          deleted: true,
          nodeId: result.nodeId,
          title: result.title,
          updatedAt,
          nodeCount,
        });
      },
    }),
    tool({
      name: "create_tab",
      description:
        "Create a new tab on an existing node and make it the active tab for that node.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        title: z.string().trim().min(1).max(80).optional(),
      }),
      outputSchema: tabMutationOutputSchema,
      execute: async ({ nodeId, title }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const node = requireNode(draft, nodeId);
          const tab = createDefaultWorkspaceTab(title?.trim() || "New tab");

          node.tabs.push(tab);
          node.viewState.activeTabId = tab.id;
          node.updatedAt = timestamp;

          return {
            nodeId: node.id,
            tabId: tab.id,
          };
        });
        const { node, tab: nextTab } = requireTab(
          workspace.getNodes(),
          result.nodeId,
          result.tabId,
        );

        return {
          node: describeNodeReference(node),
          tab: nextTab,
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "replace_tab",
      description:
        "Replace a tab with a full raw tab payload. Use get_tab_details first, edit the raw tab, then call this tool.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        tabId: z.string().trim().min(1),
        tab: workspaceNodeTabSchema,
      }),
      outputSchema: tabMutationOutputSchema,
      execute: async ({ nodeId, tabId, tab }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const { node, tab: currentTab } = requireTab(draft, nodeId, tabId);
          const currentIndex = node.tabs.findIndex((entry) => entry.id === currentTab.id);
          const nextTab = workspaceNodeTabSchema.parse({
            ...tab,
            id: currentTab.id,
            createdAt: currentTab.createdAt,
            updatedAt: timestamp,
          });

          assertBlocksUseKnownCustomTemplates(node, nextTab.blocks);
          node.tabs[currentIndex] = nextTab;
          node.updatedAt = timestamp;

          return {
            nodeId: node.id,
            tabId: nextTab.id,
          };
        });
        const { node, tab: nextTab } = requireTab(
          workspace.getNodes(),
          result.nodeId,
          result.tabId,
        );

        return {
          node: describeNodeReference(node),
          tab: nextTab,
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "delete_tab",
      description:
        "Delete a tab from a node. If it was the last tab, the node gets a fallback Overview tab so the workspace stays usable.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        tabId: z.string().trim().min(1),
      }),
      outputSchema: deleteTabOutputSchema,
      execute: async ({ nodeId, tabId }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const { node, tab } = requireTab(draft, nodeId, tabId);
          const deletedTabTitle = tab.title;
          const currentIndex = node.tabs.findIndex((entry) => entry.id === tab.id);

          node.tabs = node.tabs.filter((entry) => entry.id !== tab.id);

          if (node.tabs.length === 0) {
            const fallbackTab = createDefaultWorkspaceTab("Overview", node.content);
            node.tabs = [fallbackTab];
            node.viewState.activeTabId = fallbackTab.id;
          } else if (node.viewState.activeTabId === tab.id) {
            const nextTab =
              node.tabs[currentIndex] ??
              node.tabs[Math.max(0, currentIndex - 1)] ??
              node.tabs[0] ??
              null;
            node.viewState.activeTabId = nextTab?.id ?? null;
          }

          node.updatedAt = timestamp;

          return {
            nodeId: node.id,
            deletedTabId: tab.id,
            deletedTabTitle,
          };
        });
        const node = requireNode(workspace.getNodes(), result.nodeId);

        return {
          node,
          deletedTabId: result.deletedTabId,
          deletedTabTitle: result.deletedTabTitle,
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "create_block",
      description:
        "Create a new block inside an existing tab. Use customTemplateId when creating a custom block.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        tabId: z.string().trim().min(1),
        type: workspaceBlockTypeSchema,
        title: z.string().trim().min(1).max(120).optional(),
        customTemplateId: z.string().trim().min(1).optional(),
      }),
      outputSchema: blockMutationOutputSchema,
      execute: async ({ nodeId, tabId, type, title, customTemplateId }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const { node, tab } = requireTab(draft, nodeId, tabId);
          const block = createBlockByType({
            node,
            type,
            title,
            customTemplateId,
          });

          tab.blocks.push(block);
          tab.updatedAt = timestamp;
          node.updatedAt = timestamp;

          return {
            nodeId: node.id,
            tabId: tab.id,
            blockId: block.id,
          };
        });
        const { node, tab, block: nextBlock } = requireBlock(
          workspace.getNodes(),
          result.nodeId,
          result.tabId,
          result.blockId,
        );

        return {
          node: describeNodeReference(node),
          tab,
          block: nextBlock,
          customBlockTemplate: getCustomBlockTemplateForBlock(node, nextBlock),
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "replace_block",
      description:
        "Replace a block with a full raw block payload. Use get_block_details first, edit the raw block, then call this tool.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        tabId: z.string().trim().min(1),
        blockId: z.string().trim().min(1),
        block: workspaceBlockSchema,
      }),
      outputSchema: blockMutationOutputSchema,
      execute: async ({ nodeId, tabId, blockId, block }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const { node, tab, block: currentBlock } = requireBlock(draft, nodeId, tabId, blockId);
          const currentIndex = tab.blocks.findIndex((entry) => entry.id === currentBlock.id);
          const nextBlock = workspaceBlockSchema.parse({
            ...block,
            id: currentBlock.id,
            createdAt: currentBlock.createdAt,
            updatedAt: timestamp,
          });

          assertBlocksUseKnownCustomTemplates(node, [nextBlock]);
          tab.blocks[currentIndex] = nextBlock;
          tab.updatedAt = timestamp;
          node.updatedAt = timestamp;

          return {
            nodeId: node.id,
            tabId: tab.id,
            blockId: nextBlock.id,
          };
        });
        const { node, tab, block: nextBlock } = requireBlock(
          workspace.getNodes(),
          result.nodeId,
          result.tabId,
          result.blockId,
        );

        return {
          node: describeNodeReference(node),
          tab,
          block: nextBlock,
          customBlockTemplate: getCustomBlockTemplateForBlock(node, nextBlock),
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "delete_block",
      description: "Delete a block from a tab by id.",
      inputSchema: z.object({
        nodeId: z.string().trim().min(1),
        tabId: z.string().trim().min(1),
        blockId: z.string().trim().min(1),
      }),
      outputSchema: deleteBlockOutputSchema,
      execute: async ({ nodeId, tabId, blockId }) => {
        const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft, timestamp) => {
          const { node, tab, block } = requireBlock(draft, nodeId, tabId, blockId);
          const deletedBlockTitle = block.title;

          tab.blocks = tab.blocks.filter((entry) => entry.id !== block.id);
          tab.updatedAt = timestamp;
          node.updatedAt = timestamp;

          return {
            nodeId: node.id,
            tabId: tab.id,
            deletedBlockId: block.id,
            deletedBlockTitle,
          };
        });
        const { node, tab } = requireTab(workspace.getNodes(), result.nodeId, result.tabId);

        return {
          node: describeNodeReference(node),
          tab,
          deletedBlockId: result.deletedBlockId,
          deletedBlockTitle: result.deletedBlockTitle,
          updatedAt,
          nodeCount,
        };
      },
    }),
    tool({
      name: "get_marketplace_item_details",
      description:
        "Inspect a marketplace item with its full raw payload, including full node, tab, or block contents.",
      inputSchema: z.object({
        itemId: z.string().trim().min(1),
      }),
      outputSchema: getMarketplaceItemDetailsOutputSchema,
      execute: async ({ itemId }) => ({
        item: marketplaceItems.find((item) => item.id === itemId) ?? null,
      }),
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
