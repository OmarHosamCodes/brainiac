import { describe, expect, test } from "bun:test";
import { createWorkspaceTaskListBlock, workspaceBlockCategories, type WorkspaceBlock } from "@brainiac/workspace";

import { workspaceReactBlockEditors } from "@/components/workspace/node/block-renderer";
import { workspaceBlockRegistry } from "./workspace-block-registry";

describe("workspace block registry", () => {
  test("covers every category block and primary block", () => {
    const categoryTypes = workspaceBlockCategories.flatMap((category) =>
      category.items.map((item) => item.blockType),
    );
    const requiredTypes: WorkspaceBlock["type"][] = [
      "task-list",
      "notes",
      "decision",
      "custom",
      ...categoryTypes,
    ];

    for (const type of requiredTypes) {
      expect(workspaceBlockRegistry[type]).toBeDefined();
      expect(workspaceReactBlockEditors[type]).toBeDefined();
    }
  });

  test("primary block types are grouped for fast add controls", () => {
    expect(workspaceBlockRegistry["task-list"].addGroup).toBe("primary");
    expect(workspaceBlockRegistry.notes.addGroup).toBe("primary");
    expect(workspaceBlockRegistry.decision.addGroup).toBe("primary");
  });

  test("registered editor can render the default task-list block contract", () => {
    const block = createWorkspaceTaskListBlock();
    const Editor = workspaceBlockRegistry["task-list"].Editor;

    expect(Editor).toBeFunction();
    expect(block.type).toBe("task-list");
  });
});
