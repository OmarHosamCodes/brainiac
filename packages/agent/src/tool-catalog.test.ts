import { describe, expect, test } from "bun:test";

import { listAgentToolCatalog } from "./tool-catalog";

describe("listAgentToolCatalog", () => {
  test("returns canvas ask tools without mutators", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "ask" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("ui_present");
    expect(names).toContain("list_dashboard_nodes");
    expect(names).toContain("get_current_time");
    expect(names).not.toContain("create_node");
    expect(names).not.toContain("list_agency_time_entries");
  });

  test("returns canvas agent mutators", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "agent" });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("ui_present");
    expect(names).toContain("patch_block");
  });

  test("agency ask has reads without plan/propose tools", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "ask" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("ui_present");
    expect(names).toContain("list_agency_time_entries");
    expect(names).toContain("get_agency_reports_summary");
    expect(names).not.toContain("draft_agency_plan");
    expect(names).not.toContain("propose_agency_action");
    expect(names).not.toContain("create_node");
  });

  test("agency plan includes draft_agency_plan", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "plan" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("list_agency_projects");
    expect(names).toContain("draft_agency_plan");
    expect(names).not.toContain("propose_agency_action");
  });

  test("agency agent includes propose_agency_action", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "agent" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("propose_agency_action");
    expect(names).toContain("list_agency_time_entries");
    expect(names).not.toContain("draft_agency_plan");
  });
});
