import { describe, expect, test } from "bun:test";

import { listAgentToolCatalog } from "./tool-catalog";

describe("listAgentToolCatalog", () => {
  test("returns canvas ask tools without mutators", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "ask" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("list_dashboard_nodes");
    expect(names).toContain("get_current_time");
    expect(names).not.toContain("create_node");
    expect(names).not.toContain("list_agency_time_entries");
  });

  test("returns canvas agent mutators", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "agent" });
    expect(tools.map((tool) => tool.name)).toContain("patch_block");
  });

  test("forces agency mode to ask tools only", () => {
    const tools = listAgentToolCatalog({ surface: "agency", mode: "agent" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("list_agency_time_entries");
    expect(names).toContain("get_agency_reports_summary");
    expect(names).not.toContain("create_node");
    expect(names).not.toContain("list_dashboard_nodes");
  });
});
