import { describe, expect, test } from "bun:test";

import { resolveAgencySyncDetails } from "@/features/shared/agency-sync";

describe("resolveAgencySyncDetails", () => {
  test("returns loading guidance when no team is selected", () => {
    expect(resolveAgencySyncDetails("", 0, [])).toMatchObject({
      state: "loading",
      label: "Loading",
    });
  });

  test("surfaces failed query sources", () => {
    const details = resolveAgencySyncDetails("team-1", 0, [
      {
        queryKey: ["agencyOps", "projects", "list", { teamId: "team-1" }],
        state: {
          fetchStatus: "idle",
          status: "error",
          data: undefined,
          error: new Error("Network error"),
        },
      },
    ]);

    expect(details.state).toBe("error");
    expect(details.errors).toEqual([
      { label: "Projects", message: "Network error" },
    ]);
  });

  test("reports background sync while data already exists", () => {
    const details = resolveAgencySyncDetails("team-1", 2, [
      {
        queryKey: ["agencyOps", "clients", "list", { teamId: "team-1" }],
        state: {
          fetchStatus: "fetching",
          status: "success",
          data: { items: [] },
          error: null,
        },
      },
    ]);

    expect(details).toMatchObject({
      state: "syncing",
      label: "Syncing…",
      fetchingCount: 2,
      activeLabels: ["Clients"],
    });
  });
});
