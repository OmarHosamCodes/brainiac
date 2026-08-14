import { describe, expect, test } from "bun:test";

import { applyFlowChangesToWorkspaceNodes, workspaceNodesToFlow } from "./workspace-flow-adapter";
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
    const next = applyFlowChangesToWorkspaceNodes(
      [keep, move],
      [{ type: "position", id: "move", dragging: true, position: { x: 40, y: 80 } }],
    );
    expect(next?.[0]).toBe(keep);
    expect(next?.[1]).toMatchObject({ id: "move", x: 40, y: 80 });
  });

  test("applies NodeResizer dimensions only while resizing", () => {
    const node = fakeNode({ id: "n1", width: 320, height: 240 });
    const ignored = applyFlowChangesToWorkspaceNodes(
      [node],
      [{ type: "dimensions", id: "n1", dimensions: { width: 400, height: 300 } }],
    );
    const resized = applyFlowChangesToWorkspaceNodes(
      [node],
      [
        {
          type: "dimensions",
          id: "n1",
          resizing: true,
          dimensions: { width: 400, height: 300 },
        },
      ],
    );
    expect(ignored).toBeNull();
    expect(resized?.[0]).toMatchObject({ width: 400, height: 300 });
  });

  test("does not draw noodles for knowledge about or in relations", () => {
    const { flowEdges } = workspaceNodesToFlow(
      [
        fakeNode({
          id: "note-1",
          kind: "knowledge",
          objectType: "note",
          title: "Note",
          connections: [{ targetNodeId: "folder-1" }],
        }),
        fakeNode({
          id: "folder-1",
          kind: "folder",
          objectType: "folder",
          title: "Folder",
          width: 640,
          height: 420,
        }),
        fakeNode({
          id: "orch",
          nodeType: "orchestrator",
          kind: "document",
          connections: [{ targetNodeId: "doc" }],
        }),
        fakeNode({ id: "doc", kind: "document" }),
      ],
      [],
    );
    expect(flowEdges).toEqual([
      expect.objectContaining({ source: "orch", target: "doc" }),
    ]);
  });

  test("nests folder and inbox children as parent frames", () => {
    const { flowNodes, flowEdges } = workspaceNodesToFlow(
      [
        fakeNode({
          id: "folder-1",
          kind: "folder",
          objectType: "folder",
          x: 100,
          y: 200,
          width: 640,
          height: 420,
        }),
        fakeNode({
          id: "note-1",
          kind: "knowledge",
          objectType: "note",
          parentId: "folder-1",
          x: 140,
          y: 280,
          width: 280,
          height: 180,
        }),
        fakeNode({
          id: "__knowledge-inbox",
          kind: "inbox",
          x: -2800,
          y: -240,
          width: 900,
          height: 400,
        }),
        fakeNode({
          id: "note-2",
          kind: "knowledge",
          parentId: "__knowledge-inbox",
          x: -2776,
          y: -184,
        }),
      ],
      [],
    );
    const folderChild = flowNodes.find((node) => node.id === "note-1");
    const inbox = flowNodes.find((node) => node.id === "__knowledge-inbox");
    expect(folderChild?.parentId).toBe("folder-1");
    expect(folderChild?.position).toEqual({ x: 40, y: 80 });
    expect(folderChild?.connectable).toBe(false);
    expect(inbox?.draggable).toBe(false);
    expect(inbox?.zIndex).toBe(-1);
    expect(flowEdges).toEqual([]);
  });
});
