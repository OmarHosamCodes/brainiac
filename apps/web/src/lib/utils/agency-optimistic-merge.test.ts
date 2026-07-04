import { describe, expect, test } from "bun:test";

import {
  mergeListWithOverlay,
  pruneListOverlay,
  type AgencyListOverlay,
} from "./agency-optimistic-merge";

type Item = { id: string; title: string; status: string; updatedAt: string; viewerCompletionCount?: number };

describe("mergeListWithOverlay", () => {
  test("keeps reconciled create visible before server list includes it", () => {
    const overlay: AgencyListOverlay<Item> = {
      upserts: {
        "real-1": {
          id: "real-1",
          title: "New task",
          status: "open",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      deletedIds: {},
      idMap: { "optimistic-1": "real-1" },
    };

    const merged = mergeListWithOverlay<Item>([], overlay);
    expect(merged.map((item) => item.id)).toEqual(["real-1"]);
  });

  test("applies completion count update on an existing active todo", () => {
    const server: Item[] = [
      {
        id: "t1",
        title: "Todo",
        status: "open",
        updatedAt: "2026-01-01T00:00:00.000Z",
        viewerCompletionCount: 0,
      },
    ];
    const overlay: AgencyListOverlay<Item> = {
      upserts: {
        t1: {
          id: "t1",
          title: "Todo",
          status: "open",
          updatedAt: "2026-01-02T00:00:00.000Z",
          viewerCompletionCount: 2,
        },
      },
      deletedIds: {},
      idMap: {},
    };

    const merged = mergeListWithOverlay(server, overlay);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.viewerCompletionCount).toBe(2);
  });
});

describe("pruneListOverlay", () => {
  test("keeps in_progress optimistic status until server catches up", () => {
    const overlay: AgencyListOverlay<Item> = {
      upserts: {
        t1: {
          id: "t1",
          title: "Todo",
          status: "in_progress",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      deletedIds: {},
      idMap: {},
    };
    const server: Item[] = [
      {
        id: "t1",
        title: "Todo",
        status: "open",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const pruned = pruneListOverlay(overlay, server, (s, o) => {
      if (o.status === "in_progress" && s.status === "open") return false;
      return true;
    });

    expect(pruned.upserts.t1?.status).toBe("in_progress");
  });
});
