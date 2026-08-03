import { describe, expect, test } from "bun:test";

import {
  AI_UI_REACT_CODE_MAX,
  aiUiArtifactSchema,
  artifactFromToolCall,
  cappedArtifacts,
  parseUiPresentInput,
  UI_PRESENT_TOOL_NAME,
} from "./ui-artifact";

const schemaArtifact = {
  id: "top-members",
  kind: "schema" as const,
  title: "Top members",
  schema: {
    version: 1 as const,
    root: {
      type: "stack" as const,
      gap: "md" as const,
      children: [
        { type: "stat" as const, label: "Members", value: 1240 },
        {
          type: "table" as const,
          columns: ["Name", "Posts"],
          rows: [
            ["Amira", 42],
            ["Yusuf", null],
          ],
        },
      ],
    },
  },
};

describe("aiUiArtifactSchema", () => {
  test("accepts a nested schema artifact", () => {
    const parsed = aiUiArtifactSchema.parse(schemaArtifact);
    expect(parsed.kind).toBe("schema");
  });

  test("accepts a react artifact", () => {
    const parsed = aiUiArtifactSchema.parse({
      id: "chart",
      kind: "react",
      title: "Chart",
      code: "export default function App(){return null}",
      props: { rows: [] },
    });
    expect(parsed.kind).toBe("react");
  });

  test("rejects an unknown node type", () => {
    expect(() =>
      aiUiArtifactSchema.parse({
        ...schemaArtifact,
        schema: { version: 1, root: { type: "iframe", src: "x" } },
      }),
    ).toThrow();
  });

  test("rejects oversized react code", () => {
    expect(() =>
      aiUiArtifactSchema.parse({
        id: "big",
        kind: "react",
        title: "Big",
        code: "x".repeat(AI_UI_REACT_CODE_MAX + 1),
      }),
    ).toThrow();
  });

  test("rejects non-url image sources", () => {
    expect(() =>
      aiUiArtifactSchema.parse({
        ...schemaArtifact,
        schema: {
          version: 1,
          root: {
            type: "imageGrid",
            items: [{ src: "javascript:alert(1)" }],
          },
        },
      }),
    ).toThrow();
  });
});

describe("parseUiPresentInput", () => {
  test("unwraps { artifact }", () => {
    expect(parseUiPresentInput({ artifact: schemaArtifact }).id).toBe("top-members");
  });

  test("accepts a bare artifact", () => {
    expect(parseUiPresentInput(schemaArtifact).id).toBe("top-members");
  });

  test("unwraps double-encoded artifact JSON", () => {
    expect(parseUiPresentInput({ artifact: JSON.stringify(schemaArtifact) }).id).toBe(
      "top-members",
    );
  });

  test("unwraps stringified schema", () => {
    expect(
      parseUiPresentInput({
        ...schemaArtifact,
        schema: JSON.stringify(schemaArtifact.schema),
      }).id,
    ).toBe("top-members");
  });

  test("throws on garbage", () => {
    expect(() => parseUiPresentInput({ kind: "schema" })).toThrow();
  });
});

describe("artifactFromToolCall", () => {
  test("parses a completed ui_present call", () => {
    const artifact = artifactFromToolCall({
      name: UI_PRESENT_TOOL_NAME,
      status: "completed",
      input: { artifact: schemaArtifact },
    });
    expect(artifact?.id).toBe("top-members");
  });

  test("ignores other tools and errors", () => {
    expect(
      artifactFromToolCall({
        name: "list_dashboard_nodes",
        status: "completed",
        input: { artifact: schemaArtifact },
      }),
    ).toBeNull();
    expect(
      artifactFromToolCall({
        name: UI_PRESENT_TOOL_NAME,
        status: "error",
        input: { artifact: schemaArtifact },
      }),
    ).toBeNull();
  });
});

describe("cappedArtifacts", () => {
  test("caps at 8", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      ...schemaArtifact,
      id: `a${index}`,
    }));
    expect(cappedArtifacts(many)).toHaveLength(8);
  });
});
