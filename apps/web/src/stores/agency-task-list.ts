import { create } from "zustand";

export const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

type AgencyTaskListState = {
  createExpanded: boolean;
  doneExpanded: boolean;
  recentlyCompletedTaskId: string;
  titleDraft: string;
  selectedProjectIdForCreate: string;
  selectedAssigneeIdForCreate: string;
  collapsedClients: Set<string>;
  setCreateExpanded: (expanded: boolean) => void;
  setDoneExpanded: (expanded: boolean) => void;
  setRecentlyCompletedTaskId: (taskId: string) => void;
  setTitleDraft: (value: string) => void;
  setSelectedProjectIdForCreate: (value: string) => void;
  setSelectedAssigneeIdForCreate: (value: string) => void;
  setClientExpanded: (clientId: string, expanded: boolean) => void;
  resetCreateDraft: (options: { skipProjectStep: boolean; defaultProjectId: string; currentUserId: string }) => void;
  expandCreate: (options: { skipProjectStep: boolean; defaultProjectId: string; currentUserId: string }) => void;
  collapseCreate: (options: { skipProjectStep: boolean; defaultProjectId: string; currentUserId: string }) => void;
};

export const useAgencyTaskListStore = create<AgencyTaskListState>((set) => ({
  createExpanded: false,
  doneExpanded: false,
  recentlyCompletedTaskId: "",
  titleDraft: "",
  selectedProjectIdForCreate: "",
  selectedAssigneeIdForCreate: "",
  collapsedClients: new Set(),
  setCreateExpanded: (expanded) => set({ createExpanded: expanded }),
  setDoneExpanded: (expanded) => set({ doneExpanded: expanded }),
  setRecentlyCompletedTaskId: (taskId) => set({ recentlyCompletedTaskId: taskId }),
  setTitleDraft: (value) => set({ titleDraft: value }),
  setSelectedProjectIdForCreate: (value) => set({ selectedProjectIdForCreate: value }),
  setSelectedAssigneeIdForCreate: (value) => set({ selectedAssigneeIdForCreate: value }),
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
      selectedAssigneeIdForCreate: currentUserId,
    }),
  expandCreate: ({ skipProjectStep, defaultProjectId, currentUserId }) =>
    set({
      createExpanded: true,
      selectedAssigneeIdForCreate: currentUserId,
      selectedProjectIdForCreate: skipProjectStep ? defaultProjectId : "",
      titleDraft: "",
    }),
  collapseCreate: ({ skipProjectStep, defaultProjectId, currentUserId }) =>
    set({
      createExpanded: false,
      titleDraft: "",
      selectedProjectIdForCreate: skipProjectStep ? defaultProjectId : "",
      selectedAssigneeIdForCreate: currentUserId,
    }),
}));
