import { WORKSPACE_TASK_DOMAINS, getWorkspaceTaskDomainLabel } from "@brainiac/workspace";

import type {
  WorkspaceNodeDomainOption,
  WorkspaceNodePriorityOption,
} from "@/components/workspace/node/context";

export const workspaceNodePriorityOptions = [
  { label: "None", value: "" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] satisfies WorkspaceNodePriorityOption[];

export const workspaceNodeDomainOptions = [
  { label: "Unassigned", value: "" },
  ...WORKSPACE_TASK_DOMAINS.map((domain) => ({
    label: getWorkspaceTaskDomainLabel(domain),
    value: domain,
  })),
] satisfies WorkspaceNodeDomainOption[];
