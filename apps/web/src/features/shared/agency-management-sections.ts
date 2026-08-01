/** Agency management panes — Operations + Commercial hubs under Management. */

export type AgencyManagementPaneId = "resourcing" | "tenure" | "tags" | "invoices" | "rates";

export type AgencyManagementHubId = "operations" | "commercial";

export type AgencyManagementPane = {
  id: AgencyManagementPaneId;
  label: string;
  hub: AgencyManagementHubId;
};

export type AgencyManagementHub = {
  id: AgencyManagementHubId;
  label: string;
  panes: readonly AgencyManagementPane[];
};

export const AGENCY_MANAGEMENT_PANES: readonly AgencyManagementPane[] = [
  { id: "resourcing", label: "Resourcing", hub: "operations" },
  { id: "tenure", label: "Tenure", hub: "operations" },
  { id: "tags", label: "Tags", hub: "operations" },
  { id: "invoices", label: "Invoices", hub: "commercial" },
  { id: "rates", label: "Rates", hub: "commercial" },
] as const;

export const AGENCY_MANAGEMENT_HUBS: readonly AgencyManagementHub[] = [
  {
    id: "operations",
    label: "Operations",
    panes: AGENCY_MANAGEMENT_PANES.filter((pane) => pane.hub === "operations"),
  },
  {
    id: "commercial",
    label: "Commercial",
    panes: AGENCY_MANAGEMENT_PANES.filter((pane) => pane.hub === "commercial"),
  },
] as const;

export function isAgencyManagementPaneId(value: unknown): value is AgencyManagementPaneId {
  return AGENCY_MANAGEMENT_PANES.some((pane) => pane.id === value);
}

export function agencyManagementPaneLabel(paneId: AgencyManagementPaneId): string {
  return AGENCY_MANAGEMENT_PANES.find((pane) => pane.id === paneId)?.label ?? paneId;
}

export function managementPaneForLegacySection(
  value: string | null,
): AgencyManagementPaneId | null {
  if (value === "resourcing") return "resourcing";
  if (value === "billing") return "invoices";
  return null;
}
