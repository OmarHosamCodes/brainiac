import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  createWorkspaceNode,
  createWorkspaceTaskListBlock,
  type WorkspaceNode,
} from "@brainiac/workspace";

mock.module("@/lib/orpc", () => ({
  orpc: {
    workspace: {
      get: {
        queryOptions: () => ({
          queryKey: ["workspace", "get"],
          queryFn: async () => ({ nodes: [], updatedAt: null }),
        }),
      },
      save: {
        call: mock(async () => ({ updatedAt: "2026-01-01T00:00:00.000Z" })),
      },
      deleteNode: {
        call: mock(async () => ({ deleted: true })),
      },
    },
  },
}));

const { useWorkspaceStore } = await import("./workspace");

function makeNode(partial: Partial<WorkspaceNode> & { id: string; title: string }) {
  return createWorkspaceNode({
    x: 0,
    y: 0,
    ...partial,
  });
}

function resetStore() {
  const state = useWorkspaceStore.getState();
  if (state._saveTimer) clearTimeout(state._saveTimer);
  if (state._retryTimer) clearTimeout(state._retryTimer);
  useWorkspaceStore.setState({
    nodes: [],
    selectedNodeIds: [],
    editorOpen: false,
    editorMode: "create",
    activeNodeId: null,
    pendingNodePosition: null,
    loadApplied: false,
    isHydratingWorkspace: false,
    saveState: "idle",
    saveError: null,
    syncedAt: null,
    isPreloadingWorkspace: false,
    localRevision: 0,
    syncedRevision: 0,
    _saveTimer: null,
    _retryTimer: null,
    nodeDraft: {
      title: "",
      content: "",
      nodeType: "standard",
      tint: "neutral",
      featuredBlocks: [],
    },
  });
}

describe("workspace store", () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  test("applies the first remote snapshot", () => {
    const node = makeNode({ id: "node-1", title: "Research" });

    useWorkspaceStore.getState().handleRemoteWorkspace({
      nodes: [node],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const state = useWorkspaceStore.getState();
    expect(state.loadApplied).toBeTrue();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0]?.title).toBe("Research");
  });

  test("does not overwrite pending local changes with a later remote snapshot", () => {
    const node = makeNode({ id: "node-1", title: "Research" });
    useWorkspaceStore.getState().applyRemoteSnapshot([node], "2026-01-01T00:00:00.000Z");
    useWorkspaceStore.setState({ localRevision: 2, syncedRevision: 1 });

    useWorkspaceStore.getState().handleRemoteWorkspace({
      nodes: [makeNode({ id: "node-2", title: "Remote" })],
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(useWorkspaceStore.getState().nodes[0]?.id).toBe("node-1");
  });

  test("creates nodes with normalized tabs and dashboard state", () => {
    useWorkspaceStore.getState().applyRemoteSnapshot([], "2026-01-01T00:00:00.000Z");
    useWorkspaceStore.setState({
      nodeDraft: {
        title: "Plan",
        content: "Operating plan",
        nodeType: "standard",
        tint: "emerald",
        featuredBlocks: [],
      },
      pendingNodePosition: { x: 400, y: 260 },
      editorMode: "create",
    });

    useWorkspaceStore.getState().submitNodeEditor();

    const node = useWorkspaceStore.getState().nodes[0];
    expect(node?.title).toBe("Plan");
    expect(node?.tabs[0]?.title).toBe("Overview");
    expect(node?.dashboard.tint).toBe("emerald");
  });

  test("switching a node from orchestrator to standard removes connections", () => {
    const node = makeNode({
      id: "orch",
      title: "Hub",
      nodeType: "orchestrator",
      connections: [{ targetNodeId: "leaf" }],
    });
    useWorkspaceStore.getState().applyRemoteSnapshot([node], "2026-01-01T00:00:00.000Z");
    useWorkspaceStore.setState({ isHydratingWorkspace: false });
    useWorkspaceStore.getState().openEditNode({ nodeId: "orch" });
    useWorkspaceStore.setState((state) => ({
      nodeDraft: {
        ...state.nodeDraft,
        nodeType: "standard",
      },
    }));

    useWorkspaceStore.getState().submitNodeEditor();

    expect(useWorkspaceStore.getState().nodes[0]?.connections).toEqual([]);
  });

  test("editor block options include blocks from the active node", () => {
    const block = createWorkspaceTaskListBlock({ title: "Tasks" });
    const node = makeNode({
      id: "node-1",
      title: "Node",
      tabs: [
        {
          id: "tab-1",
          title: "Overview",
          blocks: [block],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    useWorkspaceStore.getState().applyRemoteSnapshot([node], "2026-01-01T00:00:00.000Z");
    useWorkspaceStore.setState({ isHydratingWorkspace: false });
    useWorkspaceStore.getState().openEditNode({ nodeId: "node-1" });

    expect(useWorkspaceStore.getState().editorBlockOptions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockId: block.id,
          blockTitle: "Tasks",
        }),
      ]),
    );
  });
});
