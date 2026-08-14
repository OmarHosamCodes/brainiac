import { describe, expect, test } from "bun:test";

import {
  buildObjectCreateAction,
  buildPinPlacementAction,
  knowledgeCreateDescription,
  knowledgeCreateLabel,
  knowledgeCreateSubmitLabel,
} from "@/features/workspace-knowledge/knowledge-create";

describe("knowledge-create", () => {
  test("builds a private note without placement", () => {
    const action = buildObjectCreateAction({
      kind: "note",
      title: "  Clip  ",
      visibility: "private",
    });
    expect(action).toEqual({
      type: "object.create",
      objectType: "note",
      title: "Clip",
      visibility: "private",
      teamId: null,
      about: undefined,
      placement: undefined,
    });
  });

  test("builds a source upload and a pin placement", () => {
    expect(knowledgeCreateLabel("pin")).toBe("Agency pin");
    expect(knowledgeCreateLabel("document")).toBe("Node");
    expect(knowledgeCreateSubmitLabel("note")).toBe("Place note");
    expect(knowledgeCreateDescription("pin")).toContain("Placement only");
    const source = buildObjectCreateAction({
      kind: "source",
      title: "Brief",
      visibility: "team",
      teamId: "team-1",
      sourceKind: "upload",
      uploadId: "ksrc-1",
      filename: "brief.pdf",
      mediaType: "application/pdf",
      placement: { x: 10, y: 20 },
    });
    expect(source.type).toBe("object.create");
    if (source.type !== "object.create") return;
    expect(source.properties).toEqual({
      kind: "upload",
      uploadId: "ksrc-1",
      filename: "brief.pdf",
      mediaType: "application/pdf",
    });
    const pin = buildPinPlacementAction({
      objectId: "proj-1",
      objectType: "agency.project",
      teamId: "team-1",
      x: 8,
      y: 16,
    });
    expect(pin.type).toBe("placement.upsert");
    if (pin.type !== "placement.upsert") return;
    expect(pin.width).toBe(260);
    expect(pin.height).toBe(140);
  });
});
