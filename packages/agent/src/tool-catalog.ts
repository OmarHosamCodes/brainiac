import type { AgentSurface, AgentToolCatalogEntry, DashboardAgentToolPreset } from "./types";

type ToolCatalogDefinition = Omit<AgentToolCatalogEntry, "available">;

const AGENCY_READ_MODES: DashboardAgentToolPreset[] = ["ask", "plan", "agent"];
const CANVAS_READ_MODES: DashboardAgentToolPreset[] = ["ask", "agent"];

const TOOL_CATALOG: ToolCatalogDefinition[] = [
  {
    name: "ui_present",
    usage: "Renders a schema or React UI artifact in the canvas.",
    surface: ["canvas", "agency"],
    modes: ["ask", "plan", "agent"],
  },
  {
    name: "list_dashboard_nodes",
    usage: "Lists canvas nodes with structural summaries.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "search_dashboard",
    usage: "Searches node titles, tabs, and block content on the canvas.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "list_marketplace_items",
    usage: "Lists marketplace items available for reuse.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "search_marketplace",
    usage: "Searches marketplace titles, summaries, and payloads.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "get_node_details",
    usage: "Reads one canvas node at summary or full detail.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "get_tab_details",
    usage: "Reads one tab and its blocks inside a node.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "get_block_details",
    usage: "Reads one block payload and its edit guide.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
  },
  {
    name: "get_marketplace_item_details",
    usage: "Reads one marketplace item payload.",
    surface: ["canvas"],
    modes: CANVAS_READ_MODES,
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
    modes: CANVAS_READ_MODES,
  },
  {
    name: "get_current_time",
    usage: "Returns the current ISO timestamp.",
    surface: ["canvas", "agency"],
    modes: ["ask", "plan", "agent"],
  },
  {
    name: "list_agency_time_entries",
    usage: "Lists your recent Agency time entries for the active team.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "list_agency_projects",
    usage: "Lists Agency projects and their clients for the active team.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "list_agency_members",
    usage: "Lists team members and roles for the active Agency team.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "get_agency_time_summary",
    usage: "Per-member tracked seconds for a YYYY-MM-DD range (pass only from/to).",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "get_agency_reports_summary",
    usage: "Hours by client, project, and member for a YYYY-MM-DD range.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "list_agency_clients",
    usage: "Lists Agency clients for the active team.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "list_agency_tags",
    usage: "Lists Agency tags for the active team.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "list_agency_project_tasks",
    usage: "Lists tasks for one Agency project.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "get_agency_active_timer",
    usage: "Reads the current user's active Agency timer, if any.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "get_agency_time_entry",
    usage: "Reads one Agency time entry by id.",
    surface: ["agency"],
    modes: AGENCY_READ_MODES,
  },
  {
    name: "draft_agency_plan",
    usage: "Drafts a multi-step Agency change plan for user confirmation (no writes).",
    surface: ["agency"],
    modes: ["plan"],
  },
  {
    name: "propose_agency_action",
    usage: "Proposes one Agency write with before/after for Approve/Reject.",
    surface: ["agency"],
    modes: ["agent"],
  },
];

export function listAgentToolCatalog(input: {
  surface: AgentSurface;
  mode: DashboardAgentToolPreset;
}): AgentToolCatalogEntry[] {
  return TOOL_CATALOG.filter(
    (entry) => entry.surface.includes(input.surface) && entry.modes.includes(input.mode),
  ).map((entry) => ({
    ...entry,
    available: true,
  }));
}
