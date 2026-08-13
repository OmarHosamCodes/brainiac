import { describe, expect, test } from "bun:test";

import { listAgentToolCatalog, resolveUnlockedSurfaces } from "./tool-catalog";

describe("listAgentToolCatalog", () => {
  test("returns canvas ask tools without mutators or propose", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "ask" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("ui_present");
    expect(names).toContain("list_dashboard_nodes");
    expect(names).toContain("get_current_time");
    expect(names).toContain("ask_agency_question");
    expect(names).not.toContain("create_node");
    expect(names).not.toContain("propose_canvas_action");
    expect(names).not.toContain("list_agency_time_entries");
    expect(names).not.toContain("list_agency_time_gaps");
    expect(names).not.toContain("get_agency_client_bill");
    expect(names).not.toContain("list_member_profile_alerts");
  });

  test("returns canvas agent propose without direct mutators", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "agent" });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("ui_present");
    expect(names).toContain("propose_canvas_action");
    expect(names).not.toContain("patch_block");
    expect(names).not.toContain("create_node");
  });

  test("returns canvas plan draft tool", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "plan" });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("draft_canvas_plan");
    expect(names).toContain("list_dashboard_nodes");
    expect(names).not.toContain("propose_canvas_action");
  });

  test("agency ask has reads without plan/propose tools", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "ask" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("ui_present");
    expect(names).toContain("ask_agency_question");
    expect(names).toContain("list_agency_time_entries");
    expect(names).toContain("list_agency_time_gaps");
    expect(names).toContain("get_agency_client_bill");
    expect(names).toContain("list_member_profile_alerts");
    expect(names).toContain("get_agency_reports_summary");
    expect(names).not.toContain("draft_agency_plan");
    expect(names).not.toContain("propose_agency_action");
    expect(names).not.toContain("create_node");
  });

  test("agency plan includes draft_agency_plan", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "plan" });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("list_agency_projects");
    expect(names).toContain("ask_agency_question");
    expect(names).toContain("draft_agency_plan");
    expect(names).toContain("list_agency_time_gaps");
    expect(names).toContain("get_agency_client_bill");
    expect(names).toContain("list_member_profile_alerts");
    expect(names).not.toContain("propose_agency_action");
  });

  test("agency agent includes propose_agency_action", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "agent" });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("ask_agency_question");
    expect(names).toContain("propose_agency_action");
    expect(names).toContain("list_agency_time_entries");
    expect(names).toContain("list_agency_time_gaps");
    expect(names).toContain("get_agency_client_bill");
    expect(names).toContain("list_member_profile_alerts");
    expect(names).not.toContain("draft_agency_plan");
  });

  test("unlocking canvas from agency merges catalogs", () => {
    const tools = listAgentToolCatalog({
      surface: "agency",
      mode: "agent",
      unlockedSurfaces: ["canvas"],
    });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("propose_agency_action");
    expect(names).toContain("propose_canvas_action");
    expect(names).toContain("list_dashboard_nodes");
  });
});

describe("resolveUnlockedSurfaces", () => {
  test("node scope unlocks canvas from agency", () => {
    expect(
      resolveUnlockedSurfaces({
        surface: "agency",
        scopeRefs: [{ kind: "node", id: "n1" }],
      }),
    ).toEqual(["agency", "canvas"]);
  });

  test("surface chip unlocks agency from canvas", () => {
    expect(
      resolveUnlockedSurfaces({
        surface: "canvas",
        scopeRefs: [{ kind: "surface", id: "agency" }],
      }),
    ).toEqual(["canvas", "agency"]);
  });
});
