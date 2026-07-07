import { create } from "zustand";

export const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

export type AgencyTaskRailStatusFilter = "active" | "done";

type AgencyTaskListState = {
  quickAddFocused: boolean;
  createOptionsExpanded: boolean;
  lastUsedProjectIdForCreate: string;
  railStatusFilter: AgencyTaskRailStatusFilter;
  recentlyCompletedTaskId: string;
  recentlyCreatedTaskId: string;
  recentlyCreatedBlueprintId: string;
  titleDraft: string;
  descriptionDraft: string;
  selectedProjectIdForCreate: string;
  assignedToTeamForCreate: boolean;
  selectedAssigneeIdsForCreate: string[];
  collapsedProjects: Set<string>;
  collapsedClients: Set<string>;
  setQuickAddFocused: (focused: boolean) => void;
  setCreateOptionsExpanded: (expanded: boolean) => void;
  setLastUsedProjectIdForCreate: (projectId: string) => void;
  setRailStatusFilter: (filter: AgencyTaskRailStatusFilter) => void;
  setRecentlyCompletedTaskId: (taskId: string) => void;
  setRecentlyCreatedTaskId: (taskId: string) => void;
  setRecentlyCreatedBlueprintId: (blueprintId: string) => void;
  setTitleDraft: (value: string) => void;
  setDescriptionDraft: (value: string) => void;
  setSelectedProjectIdForCreate: (value: string) => void;
  setAssignedToTeamForCreate: (value: boolean) => void;
  setSelectedAssigneeIdsForCreate: (value: string[]) => void;
  setProjectExpanded: (projectId: string, expanded: boolean) => void;
  setClientExpanded: (clientId: string, expanded: boolean) => void;
  clearQuickAdd: (options: { currentUserId: string; defaultProjectId: string }) => void;
};

function defaultAssigneeIds(currentUserId: string) {
  return currentUserId ? [currentUserId] : [];
}

export const useAgencyTaskListStore = create<AgencyTaskListState>((set) => ({
  quickAddFocused: false,
  createOptionsExpanded: false,
  lastUsedProjectIdForCreate: "",
  railStatusFilter: "active",
  recentlyCompletedTaskId: "",
  recentlyCreatedTaskId: "",
  recentlyCreatedBlueprintId: "",
  titleDraft: "",
  descriptionDraft: "",
  selectedProjectIdForCreate: "",
  assignedToTeamForCreate: false,
  selectedAssigneeIdsForCreate: [],
  collapsedProjects: new Set(),
  collapsedClients: new Set(),
  setQuickAddFocused: (focused) => set({ quickAddFocused: focused }),
  setCreateOptionsExpanded: (expanded) => set({ createOptionsExpanded: expanded }),
  setLastUsedProjectIdForCreate: (projectId) => set({ lastUsedProjectIdForCreate: projectId }),
  setRailStatusFilter: (filter) => set({ railStatusFilter: filter }),
  setRecentlyCompletedTaskId: (taskId) => set({ recentlyCompletedTaskId: taskId }),
  setRecentlyCreatedTaskId: (taskId) => set({ recentlyCreatedTaskId: taskId }),
  setRecentlyCreatedBlueprintId: (blueprintId) => set({ recentlyCreatedBlueprintId: blueprintId }),
  setTitleDraft: (value) => set({ titleDraft: value }),
  setDescriptionDraft: (value) => set({ descriptionDraft: value }),
  setSelectedProjectIdForCreate: (value) => set({ selectedProjectIdForCreate: value }),
  setAssignedToTeamForCreate: (value) =>
    set({
      assignedToTeamForCreate: value,
      ...(value ? { selectedAssigneeIdsForCreate: [] } : {}),
    }),
  setSelectedAssigneeIdsForCreate: (value) =>
    set({
      selectedAssigneeIdsForCreate: value,
      assignedToTeamForCreate: false,
    }),
  setProjectExpanded: (projectId, expanded) =>
    set((state) => {
      const next = new Set(state.collapsedProjects);
      if (expanded) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return { collapsedProjects: next };
    }),
  setClientExpanded: (clientId, expanded) =>
    set((state) => {
      const next = new Set(state.collapsedClients);
      if (expanded) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return { collapsedClients: next };
    }),
  clearQuickAdd: ({ currentUserId, defaultProjectId }) =>
    set({
      titleDraft: "",
      descriptionDraft: "",
      createOptionsExpanded: false,
      assignedToTeamForCreate: false,
      selectedAssigneeIdsForCreate: defaultAssigneeIds(currentUserId),
      selectedProjectIdForCreate: defaultProjectId,
    }),
}));

export function resolveDefaultCreateProjectId(options: {
  projects: Array<{ id: string }>;
  lastUsedProjectId: string;
}): string {
  const { projects, lastUsedProjectId } = options;
  if (lastUsedProjectId && projects.some((project) => project.id === lastUsedProjectId)) {
    return lastUsedProjectId;
  }
  if (projects.length === 1) {
    return projects[0]!.id;
  }
  return "";
}
