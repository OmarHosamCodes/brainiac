/** Agency management panes — operations grouped under Management. */

export type AgencyManagementPaneId = "resourcing" | "invoices" | "rates" | "tags" | "tenure";

export type AgencyManagementPane = {
  id: AgencyManagementPaneId;
  label: string;
  icon: string;
};

export const AGENCY_MANAGEMENT_PANES: readonly AgencyManagementPane[] = [
  { id: "resourcing", label: "Resourcing", icon: "i-lucide-calendar-range" },
  { id: "invoices", label: "Invoices", icon: "i-lucide-receipt" },
  { id: "rates", label: "Rates", icon: "i-lucide-dollar-sign" },
  { id: "tags", label: "Tags", icon: "i-lucide-tag" },
  { id: "tenure", label: "Tenure", icon: "i-lucide-users" },
] as const;

export function isAgencyManagementPaneId(value: unknown): value is AgencyManagementPaneId {
  return AGENCY_MANAGEMENT_PANES.some((pane) => pane.id === value);
}

export function managementPaneForLegacySection(
  value: string | null,
): AgencyManagementPaneId | null {
  if (value === "resourcing") return "resourcing";
  if (value === "billing") return "invoices";
  return null;
}
