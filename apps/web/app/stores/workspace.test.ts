import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createWorkspaceNode, type WorkspaceNode } from "@brainiac/workspace";

type WorkspaceSnapshot = {
  nodes: WorkspaceNode[];
  updatedAt: string | null;
};

type WorkspaceStoreTestRuntime = {
  authSession: { value: { data: { user: { id: string } } | null } };
  deletePayloads: Array<{ nodeId: string; ownerUserId?: string }>;
  mutationIndex: number;
  mutationHandlers: Array<(input: unknown) => Promise<unknown>>;
  orpc: {
    workspace: {
      deleteNode: { mutationOptions: () => object };
      get: { queryOptions: () => { queryKey: unknown[] } };
      save: { mutationOptions: () => object };
    };
  };
  queryCache: Map<string, unknown>;
  queryResult: {
    data: { value: WorkspaceSnapshot | null };
    error: { value: Error | null };
    isFetching: { value: boolean };
    isLoading: { value: boolean };
    isRefetching: { value: boolean };
    refetch: () => Promise<WorkspaceSnapshot | null>;
    status: { value: string };
  } | null;
  savedPayloads: Array<{ nodes: WorkspaceNode[] }>;
  snapshot: { value: WorkspaceSnapshot | null };
};

function createRef<T>(value: T) {
  return { value };
}

async function flushNextTick() {
  await Promise.resolve();
  await Promise.resolve();
}

function getGlobalRuntime() {
  return (globalThis as any).__teamManagementTestRuntime as {
    mutationHandlers: Array<(input: unknown) => Promise<unknown>>;
    orpc: unknown;
    queryResult: unknown;
  };
}

const runtime: WorkspaceStoreTestRuntime = {
  authSession: (globalThis as any).__teamManagementTestRuntime.authSession,
  deletePayloads: [],
  mutationHandlers: (globalThis as any).__teamManagementTestRuntime.mutationHandlers,
  mutationIndex: 0,
  orpc: {
    workspace: {
      deleteNode: {
        mutationOptions: () => ({}),
      },
      get: {
        queryOptions: () => ({
          queryKey: ["workspace", "get"],
        }),
      },
      save: {
        mutationOptions: () => ({}),
      },
    },
  },
  queryCache: (globalThis as any).__teamManagementTestRuntime.queryCache,
  queryResult: null,
  savedPayloads: [],
  snapshot: createRef<WorkspaceSnapshot | null>(null),
};

mock.module("pinia", () => ({
  defineStore: (_name: string, setup: () => Record<string, unknown>) => {
    return () => ({
      ...setup(),
      $dispose: () => undefined,
    });
  },
  skipHydrate: <T>(value: T) => value,
}));

function createNode(
  partial: Partial<WorkspaceNode> & {
    id: string;
    title: string;
  },
) {
  return createWorkspaceNode({
    x: 0,
    y: 0,
    ...partial,
  });
}

function getNode(nodes: WorkspaceNode[], nodeId: string) {
  const node = nodes.find((entry) => entry.id === nodeId);

  expect(node).toBeDefined();

  return node!;
}

async function createStore(nodes: WorkspaceNode[]) {
  const globalRuntime = getGlobalRuntime();

  runtime.snapshot.value = {
    nodes,
    updatedAt: "2026-04-04T00:00:00.000Z",
  };
  runtime.savedPayloads = [];
  runtime.deletePayloads = [];
  globalRuntime.mutationHandlers = [];
  globalRuntime.mutationHandlers.push(
    async (input: unknown) => {
      runtime.savedPayloads.push(input as { nodes: WorkspaceNode[] });

      return {
        updatedAt: new Date().toISOString(),
      };
    },
    async (input: unknown) => {
      runtime.deletePayloads.push(input as { nodeId: string; ownerUserId?: string });
      return input;
    },
  );
  runtime.queryResult = {
    data: runtime.snapshot,
    error: createRef<Error | null>(null),
    isFetching: createRef(false),
    isLoading: createRef(false),
    isRefetching: createRef(false),
    refetch: async () => runtime.snapshot.value,
    status: createRef("success"),
  };
  globalRuntime.queryResult = runtime.queryResult;
  globalRuntime.orpc = runtime.orpc;

  const { useWorkspaceStore } = await import("./workspace");
  const store = useWorkspaceStore();

  await flushNextTick();

  return store;
}

beforeEach(() => {
  const globalRuntime = getGlobalRuntime();

  runtime.authSession.value = {
    data: {
      user: {
        id: "user-1",
      },
    },
  };
  runtime.deletePayloads = [];
  runtime.queryCache.clear();
  runtime.orpc = {
    workspace: {
      deleteNode: {
        mutationOptions: () => ({}),
      },
      get: {
        queryOptions: () => ({
          queryKey: ["workspace", "get"],
        }),
      },
      save: {
        mutationOptions: () => ({}),
      },
    },
  };
  runtime.queryResult = null;
  runtime.savedPayloads = [];
  runtime.snapshot.value = null;
  globalRuntime.mutationHandlers = [];
  globalRuntime.queryResult = null;
  globalRuntime.orpc = runtime.orpc;
});

afterEach(() => {
  runtime.mutationIndex = 0;
});

describe("useWorkspaceStore connection mutations", () => {
  test("connects and disconnects canonical node pairs without duplicates", async () => {
    const orchestratorNode = createNode({
      id: "orch-1",
      title: "Hub",
      nodeType: "orchestrator",
    });
    const standardNode = createNode({
      id: "std-1",
      title: "Leaf",
      nodeType: "standard",
    });
    const store = await createStore([orchestratorNode, standardNode]);

    store.connectNodePair({
      orchestratorNodeId: "orch-1",
      standardNodeId: "std-1",
    });
    store.connectNodePair({
      orchestratorNodeId: "orch-1",
      standardNodeId: "std-1",
    });

    expect(getNode(store.nodes.value, "orch-1").connections).toEqual([{ targetNodeId: "std-1" }]);

    store.disconnectNodePair({
      orchestratorNodeId: "orch-1",
      standardNodeId: "std-1",
    });

    expect(getNode(store.nodes.value, "orch-1").connections).toEqual([]);
    store.$dispose();
  });

  test("removing a node cleans incoming orchestrator references", async () => {
    const orchestratorNode = createNode({
      id: "orch-1",
      title: "Hub",
      nodeType: "orchestrator",
      connections: [{ targetNodeId: "std-1" }, { targetNodeId: "std-2" }],
    });
    const standardA = createNode({
      id: "std-1",
      title: "Alpha",
      nodeType: "standard",
    });
    const standardB = createNode({
      id: "std-2",
      title: "Beta",
      nodeType: "standard",
    });
    const store = await createStore([orchestratorNode, standardA, standardB]);

    store.removeNode({ nodeId: "std-1" });
    await flushNextTick();

    expect(store.nodes.value.map((node) => node.id)).toEqual(["orch-1", "std-2"]);
    expect(getNode(store.nodes.value, "orch-1").connections).toEqual([{ targetNodeId: "std-2" }]);
    expect(runtime.deletePayloads).toEqual([{ nodeId: "std-1", ownerUserId: undefined }]);
    store.$dispose();
  });

  test("changing a connected standard node into an orchestrator removes incoming links", async () => {
    const orchestratorNode = createNode({
      id: "orch-1",
      title: "Hub",
      nodeType: "orchestrator",
      connections: [{ targetNodeId: "std-1" }],
    });
    const standardNode = createNode({
      id: "std-1",
      title: "Leaf",
      nodeType: "standard",
    });
    const store = await createStore([orchestratorNode, standardNode]);

    store.openEditNode({ nodeId: "std-1" });
    store.nodeDraft.nodeType = "orchestrator";
    store.submitNodeEditor();

    expect(getNode(store.nodes.value, "std-1").nodeType).toBe("orchestrator");
    expect(getNode(store.nodes.value, "orch-1").connections).toEqual([]);
    store.$dispose();
  });

  test("changing an orchestrator into a standard node clears its owned connections", async () => {
    const orchestratorNode = createNode({
      id: "orch-1",
      title: "Hub",
      nodeType: "orchestrator",
      connections: [{ targetNodeId: "std-1" }],
    });
    const standardNode = createNode({
      id: "std-1",
      title: "Leaf",
      nodeType: "standard",
    });
    const store = await createStore([orchestratorNode, standardNode]);

    store.openEditNode({ nodeId: "orch-1" });
    store.nodeDraft.nodeType = "standard";
    store.submitNodeEditor();

    expect(getNode(store.nodes.value, "orch-1").nodeType).toBe("standard");
    expect(getNode(store.nodes.value, "orch-1").connections).toEqual([]);
    store.$dispose();
  });
});
