<script setup lang="ts">
type AppShellCommandItem = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
};

const props = defineProps<{
  open: boolean;
  items: AppShellCommandItem[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const search = ref("");
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const filteredItems = computed(() => {
  const normalizedSearch = search.value.trim().toLowerCase();

  if (!normalizedSearch) {
    return props.items;
  }

  return props.items.filter((item) => {
    const haystack = [item.label, item.description].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(normalizedSearch);
  });
});

watch(
  () => props.open,
  async (nextOpen) => {
    if (!nextOpen) {
      search.value = "";
      activeIndex.value = 0;
      return;
    }

    await nextTick();
    inputRef.value?.focus();
  },
);

watch(filteredItems, (nextItems) => {
  if (nextItems.length === 0) {
    activeIndex.value = 0;
    return;
  }

  if (activeIndex.value > nextItems.length - 1) {
    activeIndex.value = nextItems.length - 1;
  }
});

function closeMenu() {
  emit("update:open", false);
}

async function runItem(item: AppShellCommandItem) {
  closeMenu();
  await item.action();
}

async function handleListKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (filteredItems.value.length === 0) return;
    activeIndex.value = (activeIndex.value + 1) % filteredItems.value.length;
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (filteredItems.value.length === 0) return;
    activeIndex.value =
      activeIndex.value === 0 ? filteredItems.value.length - 1 : activeIndex.value - 1;
    return;
  }

  if (event.key === "Enter") {
    const item = filteredItems.value[activeIndex.value];

    if (!item) {
      return;
    }

    event.preventDefault();
    await runItem(item);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="Quick jump"
    description="Search pages and shell actions."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4" @keydown="handleListKeydown">
        <div
          class="flex items-center gap-3 rounded-[1.25rem] border border-default bg-muted px-3 py-2.5"
        >
          <UIcon name="i-lucide-search" class="size-4 text-muted" />
          <input
            ref="inputRef"
            v-model="search"
            type="text"
            placeholder="Search pages or actions"
            class="min-w-0 flex-1 bg-transparent text-sm text-highlighted outline-none placeholder:text-muted"
          />
          <span
            class="rounded-lg border border-default px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"
          >
            Esc
          </span>
        </div>

        <div v-if="filteredItems.length > 0" class="space-y-1">
          <button
            v-for="(item, index) in filteredItems"
            :key="item.id"
            type="button"
            class="app-shell-command__item flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-2.5 text-left transition-colors hover:bg-elevated"
            :class="index === activeIndex ? 'bg-elevated' : ''"
            @mouseenter="activeIndex = index"
            @click="runItem(item)"
          >
            <div
              class="app-shell-command__icon flex size-9 items-center justify-center rounded-xl border border-default bg-muted text-muted"
              :class="index === activeIndex ? 'text-primary' : ''"
            >
              <UIcon :name="item.icon || 'i-lucide-corner-down-right'" class="size-4" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ item.label }}
              </p>
              <p v-if="item.description" class="truncate text-xs text-muted">
                {{ item.description }}
              </p>
            </div>

            <span
              v-if="item.shortcut"
              class="rounded-lg border border-default px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              {{ item.shortcut }}
            </span>
          </button>
        </div>

        <div
          v-else
          class="rounded-[1.1rem] border border-dashed border-default px-4 py-8 text-center"
        >
          <p class="text-sm font-medium text-highlighted">No matching command</p>
          <p class="mt-1 text-xs text-muted">Try a page name or action.</p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.app-shell-command__item {
  transition:
    background-color 180ms cubic-bezier(0.25, 1, 0.5, 1),
    transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.app-shell-command__item:active {
  transform: translateY(1px);
}
</style>
