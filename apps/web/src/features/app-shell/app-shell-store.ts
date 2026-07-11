import { create } from "zustand";

import { type AppShellMode, resolveShellMode } from "@/features/app-shell/app-navigation";

const DEFAULT_AGENT_DOCK_WIDTH = 384;
const MIN_AGENT_DOCK_WIDTH = 320;
const MAX_AGENT_DOCK_WIDTH = 640;

export function clampAgentDockWidth(width: number) {
  return Math.min(MAX_AGENT_DOCK_WIDTH, Math.max(MIN_AGENT_DOCK_WIDTH, Math.round(width)));
}

/** Collapsed rail width — keep in sync with `--app-shell-rail-width-collapsed` (topbar height uses the same token). */
export const APP_SHELL_RAIL_WIDTH_COLLAPSED = "3rem";
export const APP_SHELL_RAIL_WIDTH_EXPANDED = "14rem";

type AppShellState = {
  agentDockOpen: boolean;
  agentDockWidth: number;
  railExpanded: boolean;
  pageSubtitle: string | null;
  customDockOwnerCount: number;
  contextOwnerCount: number;
  pageCrumbOwnerCount: number;
  subtitleOwnerCount: number;
  actionsOwnerCount: number;
  agentButtonHiddenOwnerCount: number;
  currentPath: string;
  setAgentDockOpen: (open: boolean) => void;
  toggleAgentDock: () => void;
  setAgentDockWidth: (width: number) => void;
  setRailExpanded: (expanded: boolean) => void;
  toggleRail: () => void;
  setPageSubtitle: (subtitle: string | null) => void;
  acquireCustomDock: () => void;
  releaseCustomDock: () => void;
  acquireContextSlot: () => void;
  releaseContextSlot: () => void;
  acquirePageCrumbSlot: () => void;
  releasePageCrumbSlot: () => void;
  acquireSubtitleSlot: () => void;
  releaseSubtitleSlot: () => void;
  acquireActionsSlot: () => void;
  releaseActionsSlot: () => void;
  acquireAgentButtonHidden: () => void;
  releaseAgentButtonHidden: () => void;
  setCurrentPath: (path: string) => void;
};

export const useAppShellStore = create<AppShellState>((set, get) => ({
  agentDockOpen: false,
  agentDockWidth: DEFAULT_AGENT_DOCK_WIDTH,
  railExpanded: false,
  pageSubtitle: null,
  customDockOwnerCount: 0,
  contextOwnerCount: 0,
  pageCrumbOwnerCount: 0,
  subtitleOwnerCount: 0,
  actionsOwnerCount: 0,
  agentButtonHiddenOwnerCount: 0,
  currentPath: "/",
  setAgentDockOpen: (open) => set({ agentDockOpen: open }),
  toggleAgentDock: () => set({ agentDockOpen: !get().agentDockOpen }),
  setAgentDockWidth: (width) => set({ agentDockWidth: clampAgentDockWidth(width) }),
  setRailExpanded: (expanded) => set({ railExpanded: expanded }),
  toggleRail: () => set({ railExpanded: !get().railExpanded }),
  setPageSubtitle: (subtitle) => set({ pageSubtitle: subtitle }),
  acquireCustomDock: () => set({ customDockOwnerCount: get().customDockOwnerCount + 1 }),
  releaseCustomDock: () =>
    set({ customDockOwnerCount: Math.max(0, get().customDockOwnerCount - 1) }),
  acquireContextSlot: () => set({ contextOwnerCount: get().contextOwnerCount + 1 }),
  releaseContextSlot: () => set({ contextOwnerCount: Math.max(0, get().contextOwnerCount - 1) }),
  acquirePageCrumbSlot: () => set({ pageCrumbOwnerCount: get().pageCrumbOwnerCount + 1 }),
  releasePageCrumbSlot: () =>
    set({ pageCrumbOwnerCount: Math.max(0, get().pageCrumbOwnerCount - 1) }),
  acquireSubtitleSlot: () => set({ subtitleOwnerCount: get().subtitleOwnerCount + 1 }),
  releaseSubtitleSlot: () => set({ subtitleOwnerCount: Math.max(0, get().subtitleOwnerCount - 1) }),
  acquireActionsSlot: () => set({ actionsOwnerCount: get().actionsOwnerCount + 1 }),
  releaseActionsSlot: () => set({ actionsOwnerCount: Math.max(0, get().actionsOwnerCount - 1) }),
  acquireAgentButtonHidden: () =>
    set({ agentButtonHiddenOwnerCount: get().agentButtonHiddenOwnerCount + 1 }),
  releaseAgentButtonHidden: () =>
    set({
      agentButtonHiddenOwnerCount: Math.max(0, get().agentButtonHiddenOwnerCount - 1),
    }),
  setCurrentPath: (path) => set({ currentPath: path }),
}));

export function useShellMode(): AppShellMode {
  return resolveShellMode(useAppShellStore((s) => s.currentPath));
}

export function useHasCustomDockContent(): boolean {
  return useAppShellStore((s) => s.customDockOwnerCount > 0);
}

export function useHasContextContent(): boolean {
  return useAppShellStore((s) => s.contextOwnerCount > 0);
}

export function useHasPageCrumbContent(): boolean {
  return useAppShellStore((s) => s.pageCrumbOwnerCount > 0);
}

export function useHasSubtitleContent(): boolean {
  return useAppShellStore((s) => s.subtitleOwnerCount > 0);
}

export function useAgentButtonHidden(): boolean {
  return useAppShellStore((s) => s.agentButtonHiddenOwnerCount > 0);
}
