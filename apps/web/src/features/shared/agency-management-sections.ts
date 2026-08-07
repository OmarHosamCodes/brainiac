/** Agency management panes under Management. */

export type AgencyManagementPaneId = "resourcing" | "tenure" | "money";

export type AgencyManagementHubId = "operations" | "commercial";

export type AgencyManagementPane = {
  id: AgencyManagementPaneId;
  label: string;
  /** Optional page subtitle under the pane title (sentence case). */
  subtitle?: string;
  icon: string;
  hub: AgencyManagementHubId;
};

export const AGENCY_MANAGEMENT_PANES: readonly AgencyManagementPane[] = [
  { id: "resourcing", label: "Resourcing", icon: "i-lucide-users", hub: "operations" },
  { id: "tenure", label: "People", icon: "i-lucide-contact", hub: "operations" },
  {
    id: "money",
    label: "Money",
    subtitle: "Client invoices, payroll, and cash in one place.",
    icon: "i-lucide-wallet",
    hub: "commercial",
  },
] as const;

export function isAgencyManagementPaneId(value: unknown): value is AgencyManagementPaneId {
  return AGENCY_MANAGEMENT_PANES.some((pane) => pane.id === value);
}

export function agencyManagementPaneLabel(paneId: AgencyManagementPaneId): string {
  return AGENCY_MANAGEMENT_PANES.find((pane) => pane.id === paneId)?.label ?? paneId;
}

export function agencyManagementPaneSubtitle(paneId: AgencyManagementPaneId): string | undefined {
  return AGENCY_MANAGEMENT_PANES.find((pane) => pane.id === paneId)?.subtitle;
}

/** Canonical href for a Management pane under Agency. */
export function agencyManagementHref(paneId: AgencyManagementPaneId): string {
  return `/agency?section=management&manage=${paneId}`;
}

export function agencyManagementPaneFromSearch(search: string): AgencyManagementPaneId {
  const manage = new URLSearchParams(search).get("manage");
  return isAgencyManagementPaneId(manage) ? manage : "resourcing";
}

export function agencyManagementPaneTabId(paneId: AgencyManagementPaneId): string {
  return `agency-management-pane-${paneId}`;
}

export function managementPaneForLegacySection(
  value: string | null,
): AgencyManagementPaneId | null {
  if (value === "resourcing") return "resourcing";
  if (value === "billing" || value === "invoices") return "money";
  return null;
}
