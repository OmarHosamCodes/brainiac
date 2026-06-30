import { describe, expect, test } from "bun:test";

import {
  normalizeAttachmentUrl,
  selectAttachmentVariant,
  deriveLinkLabel,
} from "./agency-attachment-utils";

describe("normalizeAttachmentUrl", () => {
  test("accepts https URLs", () => {
    expect(normalizeAttachmentUrl("https://docs.stripe.com/api")).toBe(
      "https://docs.stripe.com/api",
    );
  });

  test("adds https protocol when missing", () => {
    expect(normalizeAttachmentUrl("docs.stripe.com/api")).toBe("https://docs.stripe.com/api");
  });

  test("rejects non-https URLs", () => {
    expect(normalizeAttachmentUrl("http://example.com")).toBeNull();
  });
});

describe("deriveLinkLabel", () => {
  test("uses custom label when provided", () => {
    expect(deriveLinkLabel("https://docs.stripe.com", "Stripe API")).toBe("Stripe API");
  });

  test("derives hostname from URL", () => {
    expect(deriveLinkLabel("https://docs.stripe.com/api/charges")).toContain("docs.stripe.com");
  });
});

describe("selectAttachmentVariant", () => {
  test("uses inline for composer context", () => {
    expect(
      selectAttachmentVariant(
        [{ fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 100 }],
        "composer",
      ),
    ).toBe("inline");
  });

  test("uses grid for image-only message attachments", () => {
    expect(
      selectAttachmentVariant(
        [
          { fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 100, metadata: { mediaKind: "image" } },
          { fileName: "b.png", mimeType: "image/png", sizeBytes: 200, metadata: { mediaKind: "image" } },
        ],
        "message",
      ),
    ).toBe("grid");
  });

  test("uses list for link attachments", () => {
    expect(
      selectAttachmentVariant(
        [
          {
            fileName: "Stripe docs",
            mimeType: "text/uri-list",
            sizeBytes: 0,
            metadata: { mediaKind: "link", sourceUrl: "https://docs.stripe.com" },
            storageKey: "task-links/team/task/id",
          },
        ],
        "message",
      ),
    ).toBe("list");
  });

  test("uses list when four or more files", () => {
    const attachments = Array.from({ length: 4 }, (_, index) => ({
      fileName: `file-${index}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: 100,
      metadata: { mediaKind: "image" as const },
    }));

    expect(selectAttachmentVariant(attachments, "message")).toBe("list");
  });
});
