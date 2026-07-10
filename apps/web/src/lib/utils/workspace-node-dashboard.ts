import type { WorkspaceNodeTint } from "@brainiac/workspace";
import type { CSSProperties } from "react";

export type WorkspaceNodeTintOption = {
  value: WorkspaceNodeTint;
  label: string;
  description: string;
  rgb: string;
};

export const workspaceNodeTintOptions: WorkspaceNodeTintOption[] = [
  {
    value: "neutral",
    label: "Slate",
    description: "Quiet default with a cleaner board feel.",
    rgb: "148 163 184",
  },
  {
    value: "emerald",
    label: "Moss",
    description: "Calm green for active planning lanes.",
    rgb: "16 185 129",
  },
  {
    value: "sky",
    label: "Tide",
    description: "Cool blue for product and research flows.",
    rgb: "14 165 233",
  },
  {
    value: "amber",
    label: "Signal",
    description: "Warm highlight for operational work.",
    rgb: "245 158 11",
  },
  {
    value: "rose",
    label: "Ember",
    description: "Soft red for urgent or high-stakes nodes.",
    rgb: "244 63 94",
  },
  {
    value: "indigo",
    label: "Orbit",
    description: "Deep accent for strategic or long-range work.",
    rgb: "99 102 241",
  },
];

const defaultWorkspaceNodeTintOption = workspaceNodeTintOptions[0]!;

export function getWorkspaceNodeTintOption(tint: WorkspaceNodeTint | null | undefined) {
  return (
    workspaceNodeTintOptions.find((option) => option.value === tint) ??
    defaultWorkspaceNodeTintOption
  );
}

export function getWorkspaceNodeTintStyle(
  tint: WorkspaceNodeTint | null | undefined,
): CSSProperties {
  const option = getWorkspaceNodeTintOption(tint);

  return {
    "--workspace-node-rgb": option.rgb,
  } as CSSProperties;
}
