import { describe, expect, test } from "bun:test";

import { applyFlowChangesToWorkspaceNodes } from "./workspace-flow-adapter";
import type { CanvasNodeModel } from "./canvas-types";

function fakeNode(partial: Partial<CanvasNodeModel> & { id: string }): CanvasNodeModel {
  return {
    title: "Node",
    content: "",
    nodeType: "standard",
    x: 0,
    y: 0,
    width: 320,
    height: 240,
    ...partial,
  } as CanvasNodeModel;
}

describe("applyFlowChangesToWorkspaceNodes", () => {
  test("ignores observer geometry that is not a user drag or resize", () => {
    const nodes = [fakeNode({ id: "n1", x: 10, y: 20, width: 320, height: 240 })];
    const next = applyFlowChangesToWorkspaceNodes(nodes, [
      { type: "position", id: "n1", position: { x: 99, y: 99 } },
      { type: "dimensions", id: "n1", dimensions: { width: 400, height: 300 } },
    ]);
    expect(next).toBeNull();
  });

  test("keeps unchanged node identity when another node is dragged", () => {
    const keep = fakeNode({ id: "keep", x: 0, y: 0 });
    const move = fakeNode({ id: "move", x: 0, y: 0 });
    const next = applyFlowChangesToWorkspaceNodes([keep, move], [
      { type: "position", id: "move", dragging: true, position: { x: 40, y: 80 } },
    ]);
    expect(next?.[0]).toBe(keep);
    expect(next?.[1]).toMatchObject({ id: "move", x: 40, y: 80 });
  });

  test("applies NodeResizer dimensions only while resizing", () => {
    const node = fakeNode({ id: "n1", width: 320, height: 240 });
    const ignored = applyFlowChangesToWorkspaceNodes([node], [
      { type: "dimensions", id: "n1", dimensions: { width: 400, height: 300 } },
    ]);
    const resized = applyFlowChangesToWorkspaceNodes([node], [
      {
        type: "dimensions",
        id: "n1",
        resizing: true,
        dimensions: { width: 400, height: 300 },
      },
    ]);
    expect(ignored).toBeNull();
    expect(resized?.[0]).toMatchObject({ width: 400, height: 300 });
  });
});
