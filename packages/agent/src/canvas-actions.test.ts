import { createWorkspaceNode } from "@orch/workspace";
import { describe, expect, test } from "bun:test";

import {
  bindCanvasPlanStepAction,
  canvasActionLabel,
  canvasActionSchema,
  stampCanvasCreateIds,
} from "./canvas-actions";
import { applyCanvasAction } from "./tools";

describe("canvasActionSchema", () => {
  test("parses block.create", () => {
    const action = canvasActionSchema.parse({
      type: "block.create",
      nodeId: "node-1",
      tabId: "tab-1",
      blockType: "notes",
      title: "Brief",
    });
    expect(canvasActionLabel(action)).toBe("Create notes “Brief”");
  });

  test("rejects unknown action types", () => {
    expect(() => canvasActionSchema.parse({ type: "node.clone", nodeId: "n1" })).toThrow();
  });

  test("parses team-shared node.create with agencyRef", () => {
    const action = canvasActionSchema.parse({
      type: "node.create",
      title: "Launch",
      visibility: "team",
      teamId: "team-1",
      agencyRef: { teamId: "team-1", projectId: "proj-1" },
    });
    expect(action.type).toBe("node.create");
    if (action.type === "node.create") {
      expect(action.agencyRef?.projectId).toBe("proj-1");
    }
  });
});

describe("applyCanvasAction", () => {
  test("creates then deletes a node", async () => {
    const created = await applyCanvasAction([], {
      type: "node.create",
      title: "Brief",
    });
    expect(created.nextNodes).toHaveLength(1);
    expect(created.after).toMatchObject({ title: "Brief" });

    const deleted = await applyCanvasAction(created.nextNodes, {
      type: "node.delete",
      nodeId: created.nextNodes[0]!.id,
    });
    expect(deleted.nextNodes).toHaveLength(0);
  });

  test("rejects deleting a missing node", async () => {
    await expect(
      applyCanvasAction([], { type: "node.delete", nodeId: "missing" }),
    ).rejects.toThrow();
  });

  test("creates a team node with agencyRef", async () => {
    const created = await applyCanvasAction([], {
      type: "node.create",
      title: "Launch",
      visibility: "team",
      teamId: "team-1",
      agencyRef: { teamId: "team-1", projectId: "proj-1" },
    });
    expect(created.nextNodes[0]?.agencyRef?.projectId).toBe("proj-1");
  });

  test("leaves an existing node graph unchanged on reject path (no-op snapshot)", async () => {
    const existing = createWorkspaceNode({ title: "Keep" });
    const created = await applyCanvasAction([existing], {
      type: "node.create",
      title: "Extra",
    });
    expect(created.nextNodes.map((node) => node.title).sort()).toEqual(["Extra", "Keep"]);
  });

  test("node.create with blocks seeds those types instead of default notes", async () => {
    const created = await applyCanvasAction([], {
      type: "node.create",
      title: "Brief",
      blocks: [
        { blockType: "task-list", title: "Todos" },
        { blockType: "table", title: "Schedule" },
      ],
    });
    const blockTypes = created.nextNodes[0]?.tabs[0]?.blocks.map((block) => block.type);
    expect(blockTypes).toEqual(["task-list", "table"]);
  });

  test("node.create with stamped id is stable across preview and approve", async () => {
    const preview = await applyCanvasAction([], { type: "node.create", title: "Brief" });
    const stamped = stampCanvasCreateIds(
      { type: "node.create", title: "Brief" },
      preview.after,
    );
    expect(stamped.type).toBe("node.create");
    if (stamped.type !== "node.create") return;
    const approved = await applyCanvasAction([], stamped);
    expect(approved.nextNodes[0]?.id).toBe(preview.nextNodes[0]?.id);
  });

  test("bindCanvasPlanStepAction remaps invented ids onto the last created node", () => {
    const created = createWorkspaceNode({ title: "Brief" });
    const bound = bindCanvasPlanStepAction(
      {
        type: "block.create",
        nodeId: "placeholder-node",
        tabId: "placeholder-tab",
        blockType: "task-list",
        title: "Todos",
      },
      [created],
      { nodeId: created.id, tabId: created.tabs[0]?.id ?? null },
    );
    expect(bound.type).toBe("block.create");
    if (bound.type !== "block.create") return;
    expect(bound.nodeId).toBe(created.id);
    expect(bound.tabId).toBe(created.tabs[0]?.id);
  });
});
