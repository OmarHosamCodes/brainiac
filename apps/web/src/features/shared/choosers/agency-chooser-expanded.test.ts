import { describe, expect, it } from "bun:test";

import {
  isChooserNodeExpanded,
  isChooserNodeExpandedOptIn,
} from "@/features/shared/choosers/agency-chooser-shell";

describe("agency chooser client expand-by-default (opt-out)", () => {
  it("treats unknown ids as expanded", () => {
    expect(isChooserNodeExpanded(new Set(), "client-a")).toBe(true);
  });

  it("treats collapsed ids as collapsed", () => {
    expect(isChooserNodeExpanded(new Set(["client-a"]), "client-a")).toBe(false);
    expect(isChooserNodeExpanded(new Set(["client-a"]), "client-b")).toBe(true);
  });
});

describe("agency chooser project collapse-by-default (opt-in)", () => {
  it("treats unknown ids as collapsed", () => {
    expect(isChooserNodeExpandedOptIn(new Set(), "project-a")).toBe(false);
  });

  it("treats expanded ids as expanded", () => {
    expect(isChooserNodeExpandedOptIn(new Set(["project-a"]), "project-a")).toBe(true);
    expect(isChooserNodeExpandedOptIn(new Set(["project-a"]), "project-b")).toBe(false);
  });
});
