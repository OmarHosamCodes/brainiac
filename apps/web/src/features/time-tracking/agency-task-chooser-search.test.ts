import { describe, expect, test } from "bun:test";
import {
  chooserPathMatches,
  chooserSearchExpand,
  tokenizeChooserQuery,
} from "./agency-task-chooser-search";

describe("tokenizeChooserQuery", () => {
  test("splits on unicode whitespace and lowercases", () => {
    expect(tokenizeChooserQuery("  Acme   Website ")).toEqual(["acme", "website"]);
  });

  test("returns empty for blank query", () => {
    expect(tokenizeChooserQuery("   ")).toEqual([]);
  });
});

describe("chooserPathMatches", () => {
  const acmeDesign = {
    clientName: "Acme",
    projectName: "Website",
    taskTitle: "Design",
  };

  test("empty tokens match every path", () => {
    expect(chooserPathMatches(acmeDesign, [])).toBe(true);
  });

  test("AND tokens across client project and task", () => {
    expect(chooserPathMatches(acmeDesign, ["acme", "website", "design"])).toBe(true);
    expect(chooserPathMatches(acmeDesign, ["acme", "design"])).toBe(true);
    expect(chooserPathMatches(acmeDesign, ["design"])).toBe(true);
    expect(chooserPathMatches(acmeDesign, ["acme", "mobile"])).toBe(false);
  });

  test("does not steal tokens from another client", () => {
    expect(
      chooserPathMatches(
        { clientName: "Beta", projectName: "Website", taskTitle: "Design" },
        ["acme", "design"],
      ),
    ).toBe(false);
  });

  test("project-only path without task title still matches client+project", () => {
    expect(
      chooserPathMatches({ clientName: "Acme", projectName: "Website" }, ["acme", "website"]),
    ).toBe(true);
    expect(
      chooserPathMatches({ clientName: "Acme", projectName: "Website" }, ["acme", "design"]),
    ).toBe(false);
  });
});

describe("chooserSearchExpand", () => {
  test("expands client on any hit; expands project only on task hit", () => {
    expect(chooserSearchExpand({ client: true, project: false, task: false })).toEqual({
      expandClient: true,
      expandProject: false,
    });
    expect(chooserSearchExpand({ client: false, project: true, task: false })).toEqual({
      expandClient: true,
      expandProject: false,
    });
    expect(chooserSearchExpand({ client: false, project: false, task: true })).toEqual({
      expandClient: true,
      expandProject: true,
    });
  });
});
