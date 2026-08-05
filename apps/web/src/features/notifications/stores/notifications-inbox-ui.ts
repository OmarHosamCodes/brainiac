import { create } from "zustand";

type NotificationsInboxUiState = {
  openRequested: boolean;
  requestOpen: () => void;
  consumeOpen: () => void;
};

/** Bridge so rail “N more” / collapsed badge can open the top-bar inbox popover. */
export const useNotificationsInboxUiStore = create<NotificationsInboxUiState>((set) => ({
  openRequested: false,
  requestOpen: () => set({ openRequested: true }),
  consumeOpen: () => set({ openRequested: false }),
}));
