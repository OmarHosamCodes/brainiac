<script setup lang="ts">
import AgencyTaskChooser from "~/components/agency/AgencyTaskChooser.vue";

type Draft = {
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
  linkUrl: string;
  tagIds: string[];
};

type Tag = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeName: string | null;
  dueDate: string | null;
};

const props = defineProps<{
  draft: Draft;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  error: string | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [];
  cancel: [];
  toggleTag: [tagId: string];
  updateDuration: [value: string | number | undefined];
  updateEndTime: [value: string | number | undefined];
}>();

const tagSearchTerm = ref("");

const filteredTags = computed(() => {
  const query = tagSearchTerm.value.trim().toLowerCase();

  if (!query) {
    return props.tags;
  }

  return props.tags.filter((tag) => tag.name.toLowerCase().includes(query));
});

const selectedTags = computed(() => {
  const selectedIds = new Set(props.draft.tagIds);

  return props.tags.filter((tag) => selectedIds.has(tag.id));
});
</script>

<template>
  <form class="space-y-2" @submit.prevent="emit('save')">
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="draft.description"
        aria-label="Time entry description"
        placeholder="What did you work on?"
        size="sm"
        class="min-w-64 flex-1 basis-64"
        :disabled="saving"
      />

      <AgencyTaskChooser
        v-model="draft.taskId"
        :projects="projects"
        :tasks="tasks"
        placeholder="Task"
        class="w-64 shrink-0 max-sm:w-full"
        :disabled="saving"
      />

      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="draft.date"
          type="date"
          size="sm"
          class="w-36 shrink-0"
          aria-label="Entry date"
          :disabled="saving"
        />

        <div class="flex shrink-0 items-center gap-1">
          <UInput
            v-model="draft.startTime"
            type="time"
            size="sm"
            class="w-24 font-mono tabular-nums"
            aria-label="Start time"
            :disabled="saving"
            @update:model-value="emit('updateDuration', draft.durationInput)"
          />
          <span class="text-xs text-muted">to</span>
          <UInput
            :model-value="draft.endTime"
            type="time"
            size="sm"
            class="w-24 font-mono tabular-nums"
            aria-label="End time"
            :disabled="saving"
            @update:model-value="emit('updateEndTime', $event as string | number | undefined)"
          />
        </div>

        <UInput
          :model-value="draft.durationInput"
          size="sm"
          class="w-20 shrink-0 font-mono tabular-nums"
          placeholder="1:00"
          aria-label="Duration"
          :disabled="saving"
          @update:model-value="emit('updateDuration', $event as string | number | undefined)"
        />
      </div>

      <div class="flex items-center gap-2">
        <UPopover v-if="tags.length > 0" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-tag"
            size="sm"
            variant="ghost"
            :color="draft.tagIds.length > 0 ? 'primary' : 'neutral'"
            class="max-sm:min-h-11 max-sm:min-w-11"
            :disabled="saving"
            :aria-label="`Tags${draft.tagIds.length > 0 ? ` (${draft.tagIds.length} selected)` : ''}`"
          />
          <template #content>
            <div class="w-64 space-y-2 p-2">
              <UInput
                v-model="tagSearchTerm"
                icon="i-lucide-search"
                placeholder="Search tags"
                size="xs"
              />
              <div class="flex max-h-52 flex-wrap gap-1 overflow-y-auto">
                <UButton
                  v-for="tag in filteredTags"
                  :key="tag.id"
                  type="button"
                  :variant="draft.tagIds.includes(tag.id) ? 'soft' : 'ghost'"
                  :color="draft.tagIds.includes(tag.id) ? 'primary' : 'neutral'"
                  size="xs"
                  class="rounded-full"
                  :disabled="saving"
                  @click="emit('toggleTag', tag.id)"
                >
                  {{ tag.name }}
                </UButton>

                <div v-if="filteredTags.length === 0" class="px-1 py-2 text-xs text-muted">
                  No matching tags.
                </div>
              </div>
            </div>
          </template>
        </UPopover>

        <UPopover :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-link"
            size="sm"
            variant="ghost"
            :color="draft.linkUrl ? 'primary' : 'neutral'"
            class="max-sm:min-h-11 max-sm:min-w-11"
            :disabled="saving"
            aria-label="Link URL"
          />
          <template #content>
            <div class="w-72 space-y-2 p-2">
              <UInput
                v-model="draft.linkUrl"
                icon="i-lucide-link"
                placeholder="Task, ticket, or brief URL"
                size="xs"
                :disabled="saving"
              />
              <div class="flex justify-end">
                <UButton
                  label="Clear"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :disabled="saving || !draft.linkUrl"
                  @click="draft.linkUrl = ''"
                />
              </div>
            </div>
          </template>
        </UPopover>

        <UButton
          type="submit"
          label="Save"
          color="primary"
          size="sm"
          class="shrink-0 font-bold"
          :loading="saving"
          :disabled="saving"
        />

        <UButton
          type="button"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          aria-label="Cancel"
          :disabled="saving"
          @click="emit('cancel')"
        />
      </div>
    </div>

    <div v-if="selectedTags.length > 0" class="flex flex-wrap items-center gap-1.5 pl-0.5">
      <UBadge
        v-for="tag in selectedTags"
        :key="tag.id"
        color="primary"
        variant="soft"
        size="sm"
        class="rounded-full"
      >
        {{ tag.name }}
      </UBadge>
    </div>

    <p v-if="error" class="text-xs text-error" role="alert">{{ error }}</p>
  </form>
</template>
