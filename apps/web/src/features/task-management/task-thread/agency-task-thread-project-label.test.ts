import { describe, expect, test } from "bun:test";

import { resolveTaskThreadProjectLabel } from "./agency-task-thread-project-label";

describe("resolveTaskThreadProjectLabel", () => {
  test("hides project when it duplicates the title", () => {
    expect(
      resolveTaskThreadProjectLabel({
        title: "1 bet card",
        projectName: "1 bet card",
        clientName: null,
      }),
    ).toBeNull();
  });

  test("falls back to client when project duplicates title", () => {
    expect(
      resolveTaskThreadProjectLabel({
        title: "1 bet card",
        projectName: "1 bet card",
        clientName: "Acme",
      }),
    ).toBe("Acme");
  });

  test("joins distinct project and client", () => {
    expect(
      resolveTaskThreadProjectLabel({
        title: "Design review",
        projectName: "Website",
        clientName: "Acme",
      }),
    ).toBe("Website · Acme");
  });
});
