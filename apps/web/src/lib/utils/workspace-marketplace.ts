import {
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
  cloneWorkspaceBlockForInsertion,
  cloneWorkspaceNodeForInsertion,
  cloneWorkspaceTabForInsertion,
  cloneWorkspaceTemplatesForInsertion,
  createWorkspaceId,
  createWorkspaceNodeTab,
  normalizeWorkspaceNode,
  workspaceMarketplacePayloadSchema,
  type WorkspaceBlock,
  type WorkspaceMarketplacePayload,
  type WorkspaceNode,
  type WorkspaceNodeTab,
} from "@brainiac/workspace";

function cloneForTransport<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

function getTemplateDependenciesFromBlock(block: WorkspaceBlock) {
  if (block.type !== "custom") {
    return [];
  }

  return [block.definitionId];
}

function pickTemplatesById(node: WorkspaceNode, templateIds: string[]) {
  if (templateIds.length === 0) {
    return [];
  }

  const idSet = new Set(templateIds);
  return node.customBlockTemplates.filter((template) => idSet.has(template.id));
}

export function createNodeMarketplacePayload(node: WorkspaceNode): WorkspaceMarketplacePayload {
  return workspaceMarketplacePayloadSchema.parse({
    kind: "node",
    node: cloneForTransport(node),
  });
}

export function createTabMarketplacePayload(
  node: WorkspaceNode,
  tab: WorkspaceNodeTab,
): WorkspaceMarketplacePayload {
  const templateIds = tab.blocks.flatMap((block) => getTemplateDependenciesFromBlock(block));
  const customBlockTemplates = pickTemplatesById(node, templateIds);

  return workspaceMarketplacePayloadSchema.parse({
    kind: "tab",
    tab: cloneForTransport(tab),
    customBlockTemplates: cloneForTransport(customBlockTemplates),
  });
}

export function createBlockMarketplacePayload(
  node: WorkspaceNode,
  block: WorkspaceBlock,
): WorkspaceMarketplacePayload {
  const templateIds = getTemplateDependenciesFromBlock(block);
  const customBlockTemplates = pickTemplatesById(node, templateIds);

  return workspaceMarketplacePayloadSchema.parse({
    kind: "block",
    block: cloneForTransport(block),
    customBlockTemplates: cloneForTransport(customBlockTemplates),
  });
}

export function cloneMarketplaceNodePayloadAsNode(payload: WorkspaceMarketplacePayload) {
  if (payload.kind === "node") {
    const clonedNode = cloneWorkspaceNodeForInsertion(payload.node);

    return normalizeWorkspaceNode({
      ...clonedNode,
      ownerUserId: null,
      visibility: "private",
      teamId: null,
    });
  }

  if (payload.kind === "tab") {
    const timestamp = new Date().toISOString();
    const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
      payload.customBlockTemplates,
      timestamp,
    );
    const tab = cloneWorkspaceTabForInsertion(payload.tab, templateIdMap, timestamp);
    const title = payload.tab.title.trim() || "Imported tab";

    return normalizeWorkspaceNode({
      id: createWorkspaceId("node"),
      title,
      content: "",
      label: title,
      nodeType: "standard",
      visibility: "private",
      connections: [],
      x: 0,
      y: 0,
      width: DEFAULT_WORKSPACE_NODE_WIDTH,
      height: DEFAULT_WORKSPACE_NODE_HEIGHT,
      minWidth: DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
      minHeight: DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
      createdAt: timestamp,
      updatedAt: timestamp,
      tabs: [tab],
      customBlockTemplates: templates,
      viewState: {
        activeTabId: tab.id,
        notePreviewState: {},
      },
      dashboard: {
        tint: "neutral",
        featuredBlocks: [],
      },
    });
  }

  const timestamp = new Date().toISOString();
  const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
    payload.customBlockTemplates,
    timestamp,
  );
  const block = cloneWorkspaceBlockForInsertion(payload.block, templateIdMap, timestamp);
  const tab = createWorkspaceNodeTab({
    title: "Overview",
    blocks: [block],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const title = payload.block.title.trim() || "Imported block";

  return normalizeWorkspaceNode({
    id: createWorkspaceId("node"),
    title,
    content: "",
    label: title,
    nodeType: "standard",
    visibility: "private",
    connections: [],
    x: 0,
    y: 0,
    width: DEFAULT_WORKSPACE_NODE_WIDTH,
    height: DEFAULT_WORKSPACE_NODE_HEIGHT,
    minWidth: DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    createdAt: timestamp,
    updatedAt: timestamp,
    tabs: [tab],
    customBlockTemplates: templates,
    viewState: {
      activeTabId: tab.id,
      notePreviewState: {},
    },
    dashboard: {
      tint: "neutral",
      featuredBlocks: [],
    },
  });
}

export function cloneMarketplaceTabPayload(payload: WorkspaceMarketplacePayload) {
  if (payload.kind !== "tab") {
    return null;
  }

  const timestamp = new Date().toISOString();
  const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
    payload.customBlockTemplates,
    timestamp,
  );

  return {
    templates,
    tab: cloneWorkspaceTabForInsertion(payload.tab, templateIdMap, timestamp),
  };
}

export function cloneMarketplaceBlockPayload(payload: WorkspaceMarketplacePayload) {
  if (payload.kind !== "block") {
    return null;
  }

  const timestamp = new Date().toISOString();
  const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
    payload.customBlockTemplates,
    timestamp,
  );

  return {
    templates,
    block: cloneWorkspaceBlockForInsertion(payload.block, templateIdMap, timestamp),
  };
}

export function getMarketplacePayloadTypeLabel(payload: WorkspaceMarketplacePayload) {
  if (payload.kind === "node") {
    return "Node";
  }

  if (payload.kind === "tab") {
    return "Tab";
  }

  return "Block";
}

export function getMarketplacePayloadSummary(payload: WorkspaceMarketplacePayload) {
  if (payload.kind === "node") {
    return `${payload.node.tabs.length} tabs`;
  }

  if (payload.kind === "tab") {
    return `${payload.tab.blocks.length} blocks`;
  }

  return payload.block.type;
}
