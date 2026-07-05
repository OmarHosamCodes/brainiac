import { create } from "zustand";

export const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

type AgencyTaskListState = {
  createExpanded: boolean;
  doneExpanded: boolean;
  recentlyCompletedTaskId: string;
  recentlyCreatedTaskId: string;
  recentlyCreatedBlueprintId: string;
  titleDraft: string;
  descriptionDraft: string;
  selectedProjectIdForCreate: string;
  assignedToTeamForCreate: boolean;
  selectedAssigneeIdsForCreate: string[];
  collapsedClients: Set<string>;
  setCreateExpanded: (expanded: boolean) => void;
  setDoneExpanded: (expanded: boolean) => void;
  setRecentlyCompletedTaskId: (taskId: string) => void;
  setRecentlyCreatedTaskId: (taskId: string) => void;
  setRecentlyCreatedBlueprintId: (blueprintId: string) => void;
  setTitleDraft: (value: string) => void;
  setDescriptionDraft: (value: string) => void;
  setSelectedProjectIdForCreate: (value: string) => void;
  setAssignedToTeamForCreate: (value: boolean) => void;
  setSelectedAssigneeIdsForCreate: (value: string[]) => void;
  setClientExpanded: (clientId: string, expanded: boolean) => void;
  resetCreateDraft: (options: { skipProjectStep: boolean; defaultProjectId: string; currentUserId: string }) => void;
  expandCreate: (options: { skipProjectStep: boolean; defaultProjectId: string; currentUserId: string }) => void;
  collapseCreate: (options: { skipProjectStep: boolean; defaultProjectId: string; currentUserId: string }) => void;
};

function defaultAssigneeIds(currentUserId: string) {
  return currentUserId ? [currentUserId] : [];
}

export const useAgencyTaskListStore = create<AgencyTaskListState>((set) => ({
  createExpanded: false,
  doneExpanded: false,
  recentlyCompletedTaskId: "",
  recentlyCreatedTaskId: "",
  recentlyCreatedBlueprintId: "",
  titleDraft: "",
  descriptionDraft: "",
  selectedProjectIdForCreate: "",
  assignedToTeamForCreate: false,
  selectedAssigneeIdsForCreate: [],
  collapsedClients: new Set(),
  setCreateExpanded: (expanded) => set({ createExpanded: expanded }),
  setDoneExpanded: (expanded) => set({ doneExpanded: expanded }),
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
  resetCreateDraft: ({ skipProjectStep, defaultProjectId, currentUserId }) =>
    set({
      titleDraft: "",
      descriptionDraft: "",
      selectedProjectIdForCreate: skipProjectStep ? defaultProjectId : "",
      assignedToTeamForCreate: false,
      selectedAssigneeIdsForCreate: defaultAssigneeIds(currentUserId),
    }),
  expandCreate: ({ skipProjectStep, defaultProjectId, currentUserId }) =>
    set({
      createExpanded: true,
      assignedToTeamForCreate: false,
      selectedAssigneeIdsForCreate: defaultAssigneeIds(currentUserId),
      selectedProjectIdForCreate: skipProjectStep ? defaultProjectId : "",
      titleDraft: "",
      descriptionDraft: "",
    }),
  collapseCreate: ({ skipProjectStep, defaultProjectId, currentUserId }) =>
    set({
      createExpanded: false,
      titleDraft: "",
      descriptionDraft: "",
      selectedProjectIdForCreate: skipProjectStep ? defaultProjectId : "",
      assignedToTeamForCreate: false,
      selectedAssigneeIdsForCreate: defaultAssigneeIds(currentUserId),
    }),
}));
