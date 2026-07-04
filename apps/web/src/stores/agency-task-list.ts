import { create } from "zustand";

export const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

type AgencyTaskListState = {
  createExpanded: boolean;
  doneExpanded: boolean;
  recentlyCompletedTaskId: string;
  recentlyCreatedTaskId: string;
  titleDraft: string;
  selectedProjectIdForCreate: string;
  assignedToTeamForCreate: boolean;
  selectedAssigneeIdsForCreate: string[];
  collapsedClients: Set<string>;
  setCreateExpanded: (expanded: boolean) => void;
  setDoneExpanded: (expanded: boolean) => void;
  setRecentlyCompletedTaskId: (taskId: string) => void;
  setRecentlyCreatedTaskId: (taskId: string) => void;
  setTitleDraft: (value: string) => void;
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
  titleDraft: "",
  selectedProjectIdForCreate: "",
  assignedToTeamForCreate: false,
  selectedAssigneeIdsForCreate: [],
  collapsedClients: new Set(),
  setCreateExpanded: (expanded) => set({ createExpanded: expanded }),
  setDoneExpanded: (expanded) => set({ doneExpanded: expanded }),
  setRecentlyCompletedTaskId: (taskId) => set({ recentlyCompletedTaskId: taskId }),
  setRecentlyCreatedTaskId: (taskId) => set({ recentlyCreatedTaskId: taskId }),
  setTitleDraft: (value) => set({ titleDraft: value }),
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
    }),
  collapseCreate: ({ skipProjectStep, defaultProjectId, currentUserId }) =>
    set({
      createExpanded: false,
      titleDraft: "",
      selectedProjectIdForCreate: skipProjectStep ? defaultProjectId : "",
      assignedToTeamForCreate: false,
      selectedAssigneeIdsForCreate: defaultAssigneeIds(currentUserId),
    }),
}));
