import { QueryClient } from "@tanstack/react-query";
import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
}));

const { bindQueryClient } = await import("@/lib/query-client");
const {
  findProjectTaskInCache,
  patchDeletedProjectTaskInCache,
  patchInsertedProjectTaskInCache,
  patchUpdatedProjectTaskInCache,
  reconcileCreatedProjectTaskInCache,
} = await import("./agency-query-cache");

const teamId = "team-1";

const listQueryKey = [
  ["agencyOps", "projectTasks", "list"],
  { input: { teamId, statuses: ["open", "in_progress"] }, type: "query" },
] as const;

const infiniteQueryKey = [...listQueryKey, "infinite"] as const;

function makeTask(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    teamId,
    projectId: "project-1",
    title: `Task ${id}`,
    status: "open" as const,
    assignedToTeam: true,
    assignees: [],
    dueDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function setupClient() {
  const client = new QueryClient();
  bindQueryClient(client);
  return client;
}

describe("patchInsertedProjectTaskInCache", () => {
  test("does not throw on infinite-shaped cache and prepends to pages[0]", () => {
    const client = setupClient();
    const existing = makeTask("existing");
    client.setQueryData(infiniteQueryKey, {
      pages: [{ items: [existing], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    });

    const task = makeTask("new-task");
    expect(() => patchInsertedProjectTaskInCache(teamId, task)).not.toThrow();

    const data = client.getQueryData<{
      pages: Array<{ items: Array<{ id: string }>; total?: number }>;
    }>(infiniteQueryKey);
    expect(data?.pages[0]?.items.map((item) => item.id)).toEqual(["new-task", "existing"]);
    expect(data?.pages[0]?.total).toBe(2);
  });

  test("still patches list-shaped cache", () => {
    const client = setupClient();
    client.setQueryData(listQueryKey, { items: [makeTask("existing")], total: 1 });

    patchInsertedProjectTaskInCache(teamId, makeTask("new-task"));

    const data = client.getQueryData<{ items: Array<{ id: string }>; total?: number }>(listQueryKey);
    expect(data?.items.map((item) => item.id)).toEqual(["new-task", "existing"]);
    expect(data?.total).toBe(2);
  });
});

describe("reconcileCreatedProjectTaskInCache", () => {
  test("replaces optimistic id in infinite pages", () => {
    const client = setupClient();
    client.setQueryData(infiniteQueryKey, {
      pages: [{ items: [makeTask("optimistic")], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    });

    reconcileCreatedProjectTaskInCache(teamId, "optimistic", makeTask("real"));

    const data = client.getQueryData<{ pages: Array<{ items: Array<{ id: string }> }> }>(
      infiniteQueryKey,
    );
    expect(data?.pages[0]?.items.map((item) => item.id)).toEqual(["real"]);
  });
});

describe("patchUpdatedProjectTaskInCache / patchDeletedProjectTaskInCache", () => {
  test("updates and deletes across infinite pages without throwing", () => {
    const client = setupClient();
    client.setQueryData(infiniteQueryKey, {
      pages: [
        { items: [makeTask("a")], page: 1, pageSize: 1, total: 2 },
        { items: [makeTask("b")], page: 2, pageSize: 1, total: 2 },
      ],
      pageParams: [1, 2],
    });

    patchUpdatedProjectTaskInCache(teamId, makeTask("b", { title: "Updated B" }));
    let data = client.getQueryData<{
      pages: Array<{ items: Array<{ id: string; title: string }> }>;
    }>(infiniteQueryKey);
    expect(data?.pages[1]?.items[0]?.title).toBe("Updated B");

    patchDeletedProjectTaskInCache(teamId, "a");
    data = client.getQueryData(infiniteQueryKey);
    expect(data?.pages[0]?.items).toEqual([]);
    expect(data?.pages[1]?.items.map((item) => item.id)).toEqual(["b"]);
  });
});

describe("findProjectTaskInCache", () => {
  test("finds tasks in infinite pages", () => {
    const client = setupClient();
    client.setQueryData(infiniteQueryKey, {
      pages: [{ items: [makeTask("cached")], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    });

    expect(findProjectTaskInCache(teamId, "cached")?.id).toBe("cached");
  });
});
