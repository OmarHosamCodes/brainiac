<script setup lang="ts">
import { storeToRefs } from "pinia";

import { APP_NAV_ITEMS, findActiveNavItem } from "~/utils/app-navigation";
import {
  shellFocusRingClass,
  shellRailLinkActiveClass,
  shellRailLinkBaseClass,
  shellSearchPillClass,
  shellActionsSlotClass,
  shellBreadcrumbCurrentClass,
  shellBreadcrumbMutedClass,
  shellBreadcrumbSeparatorClass,
  shellContextSlotClass,
  shellTopbarBaseClass,
  shellTopbarExecutionClass,
  shellTopbarSpatialClass,
  shellUtilityClusterClass,
} from "~/utils/app-shell-ui";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const { nodes } = storeToRefs(workspaceStore);

// Routes that actually need workspace context (driven by the `workspace`
// middleware). Other routes using this layout (billing, agency, ...) should
// not preload the workspace store nor fall back to the workspace agent panel.
const isWorkspaceRoute = computed(() => {
  const middleware = route.meta.middleware;
  if (Array.isArray(middleware)) {
    return middleware.includes("workspace");
  }
  return middleware === "workspace";
});

const {
  agentDockOpen,
  agentDockWidth,
  pageTitle,
  hasCustomDockContent,
  hasContextContent,
  shellMode,
  setAgentDockOpen,
  toggleAgentDock,
  setAgentDockWidth,
} = useAppShell();

const isMobileNavOpen = ref(false);
const isCommandMenuOpen = ref(false);
const isResizingDock = ref(false);
const shellShortcutLabel = ref("Ctrl+J");
const commandShortcutLabel = ref("Ctrl+K");

const isSpatialMode = computed(() => shellMode.value === "spatial");

const activeNavigationItem = computed(() => findActiveNavItem(route.path));

const activeNavigationLabel = computed(
  () => activeNavigationItem.value?.label ?? "Workspace",
);

const breadcrumbItems = computed(() => {
  if (isSpatialMode.value) {
    return [];
  }

  const items = [activeNavigationLabel.value];
  const detailTitle = pageTitle.value?.trim();

  if (detailTitle && detailTitle !== activeNavigationLabel.value) {
    items.push(detailTitle);
  }

  return items;
});

const showBreadcrumbs = computed(
  () => !isSpatialMode.value && breadcrumbItems.value.length > 0 && !hasContextContent.value,
);

const isContextOwned = computed(() => hasContextContent.value);

const showSearchPill = computed(() => !isSpatialMode.value && !isContextOwned.value);

const showSearchIcon = computed(() => isSpatialMode.value || isContextOwned.value);

const shellStyle = computed(() => ({
  "--app-shell-dock-width": agentDockOpen.value ? `${agentDockWidth.value}px` : "0px",
}));

const commandItems = computed(() => [
  ...APP_NAV_ITEMS.map((item) => ({
    id: item.to,
    label: item.label,
    description: `Open ${item.label.toLowerCase()}`,
    icon: item.icon,
    action: () => {
      void navigateTo(item.to);
    },
  })),
  {
    id: "toggle-agent",
    label: agentDockOpen.value ? "Close agent dock" : "Open agent dock",
    description: "Toggle the right-side agent panel",
    icon: "i-lucide-panel-right-open",
    shortcut: shellShortcutLabel.value,
    action: () => {
      toggleAgentDock();
    },
  },
]);

function handleShellShortcuts(event: KeyboardEvent) {
  const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);
  const modifier = isMac ? event.metaKey : event.ctrlKey;

  if (!modifier || event.shiftKey || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "j") {
    event.preventDefault();
    toggleAgentDock();
    return;
  }

  if (key === "k") {
    event.preventDefault();
    isCommandMenuOpen.value = true;
  }
}

function openCommandMenu() {
  isCommandMenuOpen.value = true;
}

function startDockResize(event: PointerEvent) {
  if (window.innerWidth < 1024) {
    return;
  }

  isResizingDock.value = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  const updateWidth = (moveEvent: PointerEvent) => {
    const nextWidth = window.innerWidth - moveEvent.clientX;
    setAgentDockWidth(nextWidth);
  };

  const finishResize = () => {
    isResizingDock.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", updateWidth);
    window.removeEventListener("pointerup", finishResize);
  };

  window.addEventListener("pointermove", updateWidth);
  window.addEventListener("pointerup", finishResize, { once: true });
}

onMounted(() => {
  if (typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform)) {
    shellShortcutLabel.value = "⌘J";
    commandShortcutLabel.value = "⌘K";
  }

  window.addEventListener("keydown", handleShellShortcuts);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleShellShortcuts);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});
</script>

<template>
  <div
    class="app-shell bg-default text-default"
    :class="isSpatialMode ? 'app-shell--spatial' : 'app-shell--execution'"
    :style="shellStyle"
  >
    <aside
      class="app-shell__rail hidden border-r border-default bg-muted md:flex"
      aria-label="Main navigation"
    >
      <div class="flex flex-1 flex-col items-center gap-4 py-4">
        <ULink
          to="/dashboard"
          :class="[
            shellRailLinkBaseClass,
            'border border-default bg-default text-highlighted hover:bg-elevated',
          ]"
          aria-label="Open dashboard"
          title="Dashboard"
        >
          <UIcon name="i-lucide-brain-circuit" class="size-5" />
        </ULink>

        <nav class="flex flex-1 flex-col items-center gap-2" aria-label="Sections">
          <ULink
            v-for="item in APP_NAV_ITEMS"
            :key="item.to"
            :to="item.to"
            :class="[
              shellRailLinkBaseClass,
              item.matches(route.path) ? shellRailLinkActiveClass : 'border border-transparent',
            ]"
            :aria-label="item.label"
            :aria-current="item.matches(route.path) ? 'page' : undefined"
            :title="item.label"
          >
            <UIcon :name="item.icon" class="size-4.5" />
          </ULink>
        </nav>

        <div class="flex flex-col items-center gap-2">
          <UColorModeButton
            variant="ghost"
            size="sm"
            class="size-10 items-center justify-center rounded-2xl"
          />
          <AppShellAccountMenu />
        </div>
      </div>
    </aside>

    <header
      class="app-shell__topbar"
      :class="[
        shellTopbarBaseClass,
        isSpatialMode ? shellTopbarSpatialClass : shellTopbarExecutionClass,
        isContextOwned ? 'app-shell__topbar--owned' : '',
      ]"
      role="banner"
    >
      <div class="app-shell__topbar-left">
        <ShellTopbarIconButton
          icon="i-lucide-menu"
          aria-label="Open navigation"
          class="md:hidden"
          @click="isMobileNavOpen = true"
        />

        <div id="app-shell-context" :class="shellContextSlotClass" />

        <div v-if="showBreadcrumbs" class="hidden min-w-0 items-center md:flex">
          <div class="flex min-w-0 items-center gap-2">
            <template v-for="(item, index) in breadcrumbItems" :key="`${item}-${index}`">
              <span
                class="truncate whitespace-nowrap"
                :class="
                  index === breadcrumbItems.length - 1
                    ? shellBreadcrumbCurrentClass
                    : shellBreadcrumbMutedClass
                "
              >
                {{ item }}
              </span>
              <span
                v-if="index < breadcrumbItems.length - 1"
                :class="shellBreadcrumbSeparatorClass"
                aria-hidden="true"
              >
                /
              </span>
            </template>
          </div>
        </div>
      </div>

      <div v-if="showSearchPill" class="app-shell__topbar-center">
        <button
          type="button"
          :class="[shellSearchPillClass, shellFocusRingClass]"
          :title="`Quick jump (${commandShortcutLabel})`"
          @click="openCommandMenu"
        >
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-search" class="size-4" />
            <span class="truncate">Search or jump to...</span>
          </span>
          <span
            class="rounded-lg border border-default px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]"
          >
            {{ commandShortcutLabel }}
          </span>
        </button>
      </div>

      <div :class="shellUtilityClusterClass">
        <div id="app-shell-actions" :class="shellActionsSlotClass" />

        <AppShellAgencyTimer />

        <ShellTopbarIconButton
          v-if="showSearchIcon"
          icon="i-lucide-search"
          :aria-label="`Quick jump (${commandShortcutLabel})`"
          :title="`Quick jump (${commandShortcutLabel})`"
          variant="soft"
          bordered
          @click="openCommandMenu"
        />

        <ShellTopbarActionButton
          :icon="agentDockOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
          :aria-label="agentDockOpen ? 'Close agent dock' : 'Open agent dock'"
          :title="`Agent dock (${shellShortcutLabel})`"
          :variant="agentDockOpen ? 'soft' : 'ghost'"
          :active="agentDockOpen"
          bordered
          @click="setAgentDockOpen(!agentDockOpen)"
        >
          <span class="hidden sm:inline">{{ agentDockOpen ? "Close" : "Agent" }}</span>
        </ShellTopbarActionButton>
      </div>
    </header>

    <div
      v-if="agentDockOpen"
      class="app-shell__mobile-backdrop bg-inverted/30 md:hidden"
      aria-hidden="true"
      @click="setAgentDockOpen(false)"
    />

    <aside
      class="app-shell__dock border-l border-default bg-default"
      :class="[
        agentDockOpen ? 'app-shell__dock--open' : 'app-shell__dock--closed',
        isResizingDock ? 'app-shell__dock--resizing' : '',
      ]"
      :aria-hidden="!agentDockOpen"
      role="complementary"
      aria-label="Agent panel"
    >
      <div
        class="app-shell__dock-resize hidden lg:block"
        aria-hidden="true"
        @pointerdown.prevent="startDockResize"
      >
        <span class="app-shell__dock-resize-handle bg-accented" aria-hidden="true" />
      </div>

      <div class="app-shell__dock-inner">
        <div id="app-shell-dock-content" class="min-h-0 flex-1">
          <div
            v-if="!hasCustomDockContent && isWorkspaceRoute"
            class="h-full min-h-0 flex flex-col"
          >
            <LazyDashboardAgentChatPanel :nodes="nodes" @close="setAgentDockOpen(false)" />
          </div>
        </div>
      </div>
    </aside>

    <main class="app-shell__main">
      <slot />
    </main>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isMobileNavOpen" class="app-shell__mobile-nav md:hidden">
        <button
          type="button"
          class="absolute inset-0 bg-inverted/40"
          aria-label="Close navigation"
          @click="isMobileNavOpen = false"
        />

        <div class="app-shell__mobile-nav-panel border-r border-default bg-default">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Brainiac</p>
              <p class="mt-1 text-sm font-medium text-highlighted">Workspace</p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              class="rounded-2xl"
              aria-label="Close navigation"
              @click="isMobileNavOpen = false"
            />
          </div>

          <nav class="mt-6 space-y-2" aria-label="Sections">
            <ULink
              v-for="item in APP_NAV_ITEMS"
              :key="item.to"
              :to="item.to"
              :class="[
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                item.matches(route.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-elevated hover:text-highlighted',
              ]"
              :aria-current="item.matches(route.path) ? 'page' : undefined"
              @click="isMobileNavOpen = false"
            >
              <UIcon :name="item.icon" class="size-4.5" />
              <span class="text-sm font-medium">{{ item.label }}</span>
            </ULink>
          </nav>

          <div class="mt-6">
            <UColorModeButton variant="soft" color="neutral" class="rounded-2xl" />
          </div>
        </div>
      </div>
    </Transition>

    <AppShellCommandMenu v-model:open="isCommandMenuOpen" :items="commandItems" />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  height: 100vh;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: 2.75rem minmax(0, 1fr);
}

.app-shell--execution {
  grid-template-rows: 3.5rem minmax(0, 1fr);
}

@media (min-width: 768px) {
  .app-shell {
    grid-template-columns: 3.5rem minmax(0, 1fr) var(--app-shell-dock-width);
  }
}

.app-shell__rail {
  grid-row: 1 / 3;
}

.app-shell__topbar {
  grid-column: 1 / -1;
  grid-row: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 28rem) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0 0.9rem;
}

.app-shell__topbar--spatial {
  grid-template-columns: minmax(0, 1fr) auto;
}

.app-shell__topbar--owned {
  grid-template-columns: minmax(0, 1fr) auto;
}

.app-shell__topbar--execution:not(.app-shell__topbar--owned) {
  grid-template-columns: minmax(0, 1fr) minmax(0, 28rem) auto;
}

@media (min-width: 768px) {
  .app-shell__topbar {
    grid-column: 2 / 4;
    padding: 0 1rem 0 1.1rem;
  }
}

.app-shell__topbar-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.app-shell__context {
  display: flex;
  min-width: 0;
  align-items: center;
}

.app-shell__context:empty {
  display: none;
}

.app-shell__topbar-center {
  display: flex;
  min-width: 0;
  justify-content: center;
}

.app-shell__utilities {
  justify-self: end;
}

.app-shell__main {
  grid-column: 1 / -1;
  grid-row: 2;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .app-shell__main {
    grid-column: 2;
  }
}

.app-shell__mobile-backdrop {
  position: fixed;
  inset: 2.75rem 0 0 0;
  z-index: 45;
}

.app-shell--execution .app-shell__mobile-backdrop {
  inset: 3.5rem 0 0 0;
}

.app-shell__dock {
  position: fixed;
  right: 0;
  top: 2.75rem;
  bottom: 0;
  z-index: 50;
  width: min(100vw, 28rem);
  transform: translateX(100%);
  transition:
    transform 200ms cubic-bezier(0.25, 1, 0.5, 1),
    opacity 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.app-shell--execution .app-shell__dock {
  top: 3.5rem;
}

@media (min-width: 768px) {
  .app-shell__dock {
    position: relative;
    top: auto;
    bottom: auto;
    grid-column: 3;
    grid-row: 2;
    width: var(--app-shell-dock-width);
    transform: none;
    opacity: 1;
  }
}

.app-shell__dock--open {
  transform: translateX(0);
}

.app-shell__dock--closed {
  opacity: 0;
  pointer-events: none;
}

@media (min-width: 768px) {
  .app-shell__dock--closed {
    opacity: 1;
  }
}

.app-shell__dock--resizing {
  transition: none;
}

.app-shell__dock-inner {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.app-shell__dock-resize {
  position: absolute;
  left: -0.35rem;
  top: 0;
  z-index: 10;
  height: 100%;
  width: 0.7rem;
  cursor: col-resize;
}

.app-shell__dock-resize-handle {
  position: absolute;
  left: 0.32rem;
  top: 0;
  display: block;
  height: 100%;
  width: 1px;
  opacity: 0;
  transition: opacity 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.app-shell__dock-resize:hover .app-shell__dock-resize-handle,
.app-shell__dock--resizing .app-shell__dock-resize-handle {
  opacity: 1;
}

.app-shell__mobile-nav {
  position: fixed;
  inset: 0;
  z-index: 70;
}

.app-shell__mobile-nav-panel {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100%;
  width: min(88vw, 20rem);
  flex-direction: column;
  padding: 1.25rem;
}

@media (max-width: 767px) {
  .app-shell__topbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .app-shell__topbar-center {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell__dock {
    transition: none;
  }
}
</style>
