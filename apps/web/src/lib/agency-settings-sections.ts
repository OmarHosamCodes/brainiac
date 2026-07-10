/**
 * Agency settings panes — single source of truth for settings IA.
 */
export type AgencySettingsPaneId = "rates" | "tenure" | "integrations" | "colors";

export type AgencySettingsPane = {
  id: AgencySettingsPaneId;
  label: string;
  icon: string;
  status?: "soon";
};

export const AGENCY_SETTINGS_PANES: readonly AgencySettingsPane[] = [
  { id: "rates", label: "Rates", icon: "i-lucide-dollar-sign" },
  { id: "tenure", label: "Tenure", icon: "i-lucide-users" },
  { id: "integrations", label: "Integrations", icon: "i-lucide-plug" },
  { id: "colors", label: "Colors", icon: "i-lucide-palette", status: "soon" },
] as const;

export function isAgencySettingsPaneId(value: unknown): value is AgencySettingsPaneId {
  return AGENCY_SETTINGS_PANES.some((pane) => pane.id === value);
}

export function agencySettingsPaneIndex(paneId: AgencySettingsPaneId): number {
  const index = AGENCY_SETTINGS_PANES.findIndex((pane) => pane.id === paneId);
  return index >= 0 ? index : 0;
}
