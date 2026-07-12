import { create } from "zustand";

import { refreshAppWithMinDwell } from "@/features/app-shell/app-update";

type AppUpdateState = {
  updateAvailable: boolean;
  isRefreshing: boolean;
  markUpdateAvailable: () => void;
  beginRefresh: () => Promise<void>;
};

export const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  updateAvailable: false,
  isRefreshing: false,
  markUpdateAvailable: () => {
    if (get().isRefreshing) return;
    set({ updateAvailable: true });
  },
  beginRefresh: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true, updateAvailable: true });
    await refreshAppWithMinDwell();
  },
}));
