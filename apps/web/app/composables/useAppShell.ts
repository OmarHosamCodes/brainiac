import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

const DEFAULT_AGENT_DOCK_WIDTH = 384;
const MIN_AGENT_DOCK_WIDTH = 320;
const MAX_AGENT_DOCK_WIDTH = 640;

export function clampAgentDockWidth(width: number) {
  return Math.min(MAX_AGENT_DOCK_WIDTH, Math.max(MIN_AGENT_DOCK_WIDTH, Math.round(width)));
}

export function useAppShell() {
  const agentDockOpen = useState("app-shell-agent-open", () => false);
  const agentDockWidth = useState("app-shell-agent-width", () => DEFAULT_AGENT_DOCK_WIDTH);
  const pageTitle = useState<string | null>("app-shell-page-title", () => null);
  // Counter of active owners providing custom dock content. Boolean would
  // briefly flip false during navigation when an old page disposes after a
  // new page mounts; counting keeps the flag true while any owner exists.
  const customDockOwnerCount = useState("app-shell-custom-dock-owners", () => 0);
  const hasCustomDockContent = computed(() => customDockOwnerCount.value > 0);

  function setAgentDockOpen(nextOpen: boolean) {
    agentDockOpen.value = nextOpen;
  }

  function toggleAgentDock() {
    agentDockOpen.value = !agentDockOpen.value;
  }

  function setAgentDockWidth(nextWidth: number) {
    agentDockWidth.value = clampAgentDockWidth(nextWidth);
  }

  function setPageTitle(nextTitle: string | null) {
    pageTitle.value = nextTitle;
  }

  function acquireCustomDock() {
    customDockOwnerCount.value += 1;
  }

  function releaseCustomDock() {
    customDockOwnerCount.value = Math.max(0, customDockOwnerCount.value - 1);
  }

  return {
    agentDockOpen,
    agentDockWidth,
    pageTitle,
    hasCustomDockContent,
    setAgentDockOpen,
    toggleAgentDock,
    setAgentDockWidth,
    setPageTitle,
    acquireCustomDock,
    releaseCustomDock,
  };
}

export function useAppShellPageTitle(title: MaybeRefOrGetter<string | null | undefined>) {
  const { pageTitle, setPageTitle } = useAppShell();

  // Track the last value we wrote so cleanup only clears the title when this
  // owner is still the current author. Comparing against `toValue(title)` at
  // dispose time is unreliable because reactive sources (e.g. node.value) can
  // become undefined before dispose runs.
  let lastWritten: string | null = null;

  watch(
    () => toValue(title) ?? null,
    (nextTitle) => {
      lastWritten = nextTitle;
      setPageTitle(nextTitle);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    if (pageTitle.value === lastWritten) {
      setPageTitle(null);
    }
  });
}

export function useAppShellCustomDock() {
  const { acquireCustomDock, releaseCustomDock } = useAppShell();

  // Acquire synchronously during setup so SSR and the first hydrated frame
  // already reflect that this page owns the dock content. Releasing in
  // onScopeDispose pairs with the synchronous acquire and is safe even if
  // another page has already acquired (counter stays > 0).
  acquireCustomDock();

  onScopeDispose(() => {
    releaseCustomDock();
  });
}
