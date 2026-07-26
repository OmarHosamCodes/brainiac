import type { AgentSurface, AgentToolCatalogEntry, DashboardAgentToolPreset } from "./types";

type ToolCatalogDefinition = Omit<AgentToolCatalogEntry, "available">;

const TOOL_CATALOG: ToolCatalogDefinition[] = [
  {
    name: "list_dashboard_nodes",
    usage: "Lists canvas nodes with structural summaries.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "search_dashboard",
    usage: "Searches node titles, tabs, and block content on the canvas.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "list_marketplace_items",
    usage: "Lists marketplace items available for reuse.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "search_marketplace",
    usage: "Searches marketplace titles, summaries, and payloads.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "get_node_details",
    usage: "Reads one canvas node at summary or full detail.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "get_tab_details",
    usage: "Reads one tab and its blocks inside a node.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "get_block_details",
    usage: "Reads one block payload and its edit guide.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "get_marketplace_item_details",
    usage: "Reads one marketplace item payload.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "create_node",
    usage: "Creates a canvas node.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "replace_node",
    usage: "Replaces a canvas node structure.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "delete_node",
    usage: "Deletes a canvas node.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "create_tab",
    usage: "Creates a tab inside a node.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "replace_tab",
    usage: "Replaces a tab and its blocks.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "delete_tab",
    usage: "Deletes a tab from a node.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "create_block",
    usage: "Creates a block inside a tab.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "patch_block",
    usage: "Patches block fields with set, merge, append, or remove.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "replace_block",
    usage: "Replaces an entire block payload.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "delete_block",
    usage: "Deletes a block from a tab.",
    surface: ["canvas"],
    modes: ["agent"],
  },
  {
    name: "fetch_web_page",
    usage: "Fetches a public web page title and text excerpt.",
    surface: ["canvas"],
    modes: ["ask", "agent"],
  },
  {
    name: "get_current_time",
    usage: "Returns the current ISO timestamp.",
    surface: ["canvas", "agency"],
    modes: ["ask", "agent"],
  },
  {
    name: "list_agency_time_entries",
    usage: "Lists your recent Agency time entries for the active team.",
    surface: ["agency"],
    modes: ["ask"],
  },
  {
    name: "list_agency_projects",
    usage: "Lists Agency projects and their clients for the active team.",
    surface: ["agency"],
    modes: ["ask"],
  },
  {
    name: "list_agency_members",
    usage: "Lists team members and roles for the active Agency team.",
    surface: ["agency"],
    modes: ["ask"],
  },
  {
    name: "get_agency_time_summary",
    usage: "Summarizes tracked seconds by member for a date range.",
    surface: ["agency"],
    modes: ["ask"],
  },
  {
    name: "get_agency_reports_summary",
    usage: "Summarizes hours by client, project, and member for a range.",
    surface: ["agency"],
    modes: ["ask"],
  },
];

export function listAgentToolCatalog(input: {
  surface: AgentSurface;
  mode: DashboardAgentToolPreset;
}): AgentToolCatalogEntry[] {
  const mode = input.surface === "agency" ? "ask" : input.mode;

  return TOOL_CATALOG.filter(
    (entry) => entry.surface.includes(input.surface) && entry.modes.includes(mode),
  ).map((entry) => ({
    ...entry,
    available: true,
  }));
}
