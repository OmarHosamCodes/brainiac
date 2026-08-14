import { describe, expect, test } from "bun:test";

import type { KnowledgeBoardCard } from "@orch/workspace";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import {
  findFolderDropTarget,
  knowledgeOpenHref,
  mergeCanvasBoard,
  shouldPersistKnowledgeGeometry,
} from "@/features/workspace-knowledge/board-cards";

function documentNode(partial: Partial<CanvasNodeModel> & { id: string }): CanvasNodeModel {
  return {
    title: "Doc",
    nodeType: "standard",
    x: 0,
    y: 0,
    width: 320,
    height: 240,
    connections: [],
    ...partial,
  };
}

function knowledgeCard(partial: Partial<KnowledgeBoardCard> & { id: string }): KnowledgeBoardCard {
  return {
    kind: "knowledge",
    objectType: "note",
    title: "Note",
    x: 10,
    y: 20,
    width: 280,
    height: 180,
    href: `/object/${partial.id}`,
    chip: "Note",
    origin: "canvas",
    ...partial,
  };
}

describe("mergeCanvasBoard", () => {
  test("keeps documents on node pages and knowledge on object pages", () => {
    const merged = mergeCanvasBoard(
      [
        documentNode({
          id: "node-1",
          nodeType: "orchestrator",
          connections: [{ targetNodeId: "node-2" }],
        }),
      ],
      [
        knowledgeCard({ id: "kobj-1" }),
        knowledgeCard({
          id: "folder-1",
          kind: "folder",
          objectType: "folder",
          title: "Research",
          chip: "Folder",
          x: 0,
          y: 0,
          width: 640,
          height: 420,
        }),
        knowledgeCard({
          id: "kobj-1-child",
          title: "Child",
          parentId: "folder-1",
          x: 40,
          y: 80,
        }),
        knowledgeCard({
          id: "proj-1",
          kind: "agency",
          objectType: "agency.project",
          title: "Launch",
          chip: "Project",
          origin: "agency",
          readOnly: true,
        }),
      ],
    );
    expect(merged.map((node) => node.kind)).toEqual([
      "document",
      "knowledge",
      "folder",
      "knowledge",
      "agency",
    ]);
    expect(knowledgeOpenHref(merged[0]!)).toBe("/node/node-1");
    expect(knowledgeOpenHref(merged[1]!)).toBe("/object/kobj-1");
    expect(merged[3]?.parentId).toBe("folder-1");
    expect(merged[0]?.connections).toEqual([{ targetNodeId: "node-2" }]);
    expect(merged[1]?.connections).toEqual([]);
  });

  test("detects folder drop targets without treating documents as nestable", () => {
    const nodes = mergeCanvasBoard(
      [documentNode({ id: "node-1", x: 50, y: 50 })],
      [
        knowledgeCard({
          id: "folder-1",
          kind: "folder",
          objectType: "folder",
          title: "Research",
          chip: "Folder",
          x: 0,
          y: 0,
          width: 640,
          height: 420,
        }),
        knowledgeCard({ id: "kobj-1", x: 40, y: 80 }),
      ],
    );
    expect(findFolderDropTarget(nodes, "kobj-1")).toBe("folder-1");
    expect(findFolderDropTarget(nodes, "node-1")).toBeNull();
  });

  test("keeps inbox cards unplaced until they leave the cluster or land in a folder", () => {
    const nodes = mergeCanvasBoard(
      [],
      [
        knowledgeCard({
          id: "__knowledge-inbox",
          kind: "inbox",
          objectType: "folder",
          title: "Inbox",
          chip: "Inbox",
          origin: "inbox",
          x: 0,
          y: 0,
          width: 640,
          height: 420,
        }),
        knowledgeCard({
          id: "kobj-unplaced",
          title: "Loose",
          parentId: "__knowledge-inbox",
          unplaced: true,
          origin: "inbox",
          x: 40,
          y: 80,
        }),
        knowledgeCard({
          id: "folder-1",
          kind: "folder",
          objectType: "folder",
          title: "Research",
          chip: "Folder",
          x: 800,
          y: 0,
          width: 640,
          height: 420,
        }),
      ],
    );
    expect(shouldPersistKnowledgeGeometry(nodes, "kobj-unplaced")).toBe(false);
    const movedOut = nodes.map((node) =>
      node.id === "kobj-unplaced"
        ? { ...node, x: 900, y: 40, parentId: null, unplaced: true }
        : node,
    );
    expect(shouldPersistKnowledgeGeometry(movedOut, "kobj-unplaced")).toBe(true);
    expect(findFolderDropTarget(movedOut, "kobj-unplaced")).toBe("folder-1");
    expect(knowledgeOpenHref(nodes[0]!)).toBeNull();
  });
});
