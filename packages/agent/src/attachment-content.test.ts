import { describe, expect, test } from "bun:test";

import {
  buildAgentModelUserContent,
  composeAgentTurnUserContent,
  titleSeedFromAgentTurn,
} from "./attachment-content";

describe("attachment-content", () => {
  test("composes draft with labeled file blocks", () => {
    expect(
      composeAgentTurnUserContent("Summarize this", [
        {
          filename: "notes.md",
          mediaType: "text/markdown",
          text: "# Hello",
        },
      ]),
    ).toBe("Summarize this\n\nAttached file: notes.md\n```markdown\n# Hello\n```");
  });

  test("allows attachment-only turns", () => {
    expect(
      composeAgentTurnUserContent("", [
        {
          filename: "data.json",
          mediaType: "application/json",
          text: '{"a":1}',
        },
      ]),
    ).toBe('Attached file: data.json\n```json\n{"a":1}\n```');
  });

  test("skips images when composing text body", () => {
    expect(
      composeAgentTurnUserContent("Look", [
        {
          filename: "shot.png",
          mediaType: "image/png",
          text: "data:image/png;base64,aaa",
        },
      ]),
    ).toBe("Look");
  });

  test("builds multimodal content for images", () => {
    expect(
      buildAgentModelUserContent("Describe", [
        {
          filename: "shot.png",
          mediaType: "image/png",
          text: "data:image/png;base64,aaa",
        },
      ]),
    ).toEqual([
      { type: "input_text", text: "Describe" },
      {
        type: "input_image",
        imageUrl: "data:image/png;base64,aaa",
        detail: "auto",
      },
    ]);
  });

  test("title seed prefers draft then filename", () => {
    expect(titleSeedFromAgentTurn("Hello", [])).toBe("Hello");
    expect(
      titleSeedFromAgentTurn("", [{ filename: "spec.md", mediaType: "text/markdown", text: "x" }]),
    ).toBe("spec.md");
    expect(titleSeedFromAgentTurn("", [])).toBe("");
  });
});
