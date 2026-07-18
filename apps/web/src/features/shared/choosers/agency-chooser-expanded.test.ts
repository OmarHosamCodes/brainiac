import { describe, expect, it } from "bun:test";

import { isChooserNodeExpanded } from "@/features/shared/choosers/agency-chooser-shell";

describe("agency chooser expand-by-default", () => {
  it("treats unknown ids as expanded", () => {
    expect(isChooserNodeExpanded(new Set(), "project-a")).toBe(true);
  });

  it("treats collapsed ids as collapsed", () => {
    expect(isChooserNodeExpanded(new Set(["project-a"]), "project-a")).toBe(false);
    expect(isChooserNodeExpanded(new Set(["project-a"]), "project-b")).toBe(true);
  });
});
