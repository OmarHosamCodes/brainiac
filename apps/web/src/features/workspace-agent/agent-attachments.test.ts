import { describe, expect, test } from "bun:test";

import {
  decodeDataUrlText,
  filePartsToAgentAttachments,
  resolveAgentAttachmentMediaType,
} from "./agent-attachments";

describe("agent-attachments", () => {
  test("resolves media type from extension when mime is empty", () => {
    expect(resolveAgentAttachmentMediaType({ filename: "notes.md", mediaType: "" })).toBe(
      "text/markdown",
    );
    expect(resolveAgentAttachmentMediaType({ filename: "data.json" })).toBe("application/json");
    expect(resolveAgentAttachmentMediaType({ filename: "shot.png" })).toBe("image/png");
    expect(resolveAgentAttachmentMediaType({ filename: "photo.bmp" })).toBeNull();
  });

  test("decodes base64 data urls", () => {
    const encoded = btoa("hello");
    expect(decodeDataUrlText(`data:text/plain;base64,${encoded}`)).toBe("hello");
  });

  test("maps file parts into agent attachments", () => {
    const encoded = btoa('{"ok":true}');
    expect(
      filePartsToAgentAttachments([
        {
          filename: "payload.json",
          mediaType: "application/json",
          url: `data:application/json;base64,${encoded}`,
        },
      ]),
    ).toEqual([
      {
        filename: "payload.json",
        mediaType: "application/json",
        text: '{"ok":true}',
      },
    ]);
  });

  test("keeps image data urls intact", () => {
    const url = "data:image/png;base64,aaa";
    expect(
      filePartsToAgentAttachments([
        {
          filename: "shot.png",
          mediaType: "image/png",
          url,
        },
      ]),
    ).toEqual([
      {
        filename: "shot.png",
        mediaType: "image/png",
        text: url,
      },
    ]);
  });
});
