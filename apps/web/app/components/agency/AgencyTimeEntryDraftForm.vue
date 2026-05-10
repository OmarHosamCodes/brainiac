<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";

type Draft = {
  projectId: string;
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

defineProps<{
  draft: Draft;
  projectItems: SelectMenuItem[];
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
</script>

<template>
  <form
    class="mt-3 space-y-3 rounded-2xl border border-default bg-elevated/20 p-3"
    @submit.prevent="emit('save')"
  >
    <div class="grid gap-3 md:grid-cols-[minmax(12rem,1.3fr)_8rem_7rem_7rem_7rem]">
      <div>
        <label class="text-[11px] font-bold text-muted">Project</label>
        <USelectMenu
          v-model="draft.projectId"
          :items="projectItems"
          value-key="value"
          size="sm"
          placeholder="Project"
          class="mt-1 w-full"
        />
      </div>
      <div>
        <label class="text-[11px] font-bold text-muted">Date</label>
        <UInput v-model="draft.date" type="date" size="sm" class="mt-1" />
      </div>
      <div>
        <label class="text-[11px] font-bold text-muted">Start</label>
        <UInput
          v-model="draft.startTime"
          type="time"
          size="sm"
          class="mt-1 font-mono"
          @update:model-value="emit('updateDuration', draft.durationInput)"
        />
      </div>
      <div>
        <label class="text-[11px] font-bold text-muted">End</label>
        <UInput
          :model-value="draft.endTime"
          type="time"
          size="sm"
          class="mt-1 font-mono"
          @update:model-value="emit('updateEndTime', $event as string | number | undefined)"
        />
      </div>
      <div>
        <label class="text-[11px] font-bold text-muted">Duration</label>
        <UInput
          :model-value="draft.durationInput"
          size="sm"
          class="mt-1 font-mono"
          placeholder="1:00"
          @update:model-value="emit('updateDuration', $event as string | number | undefined)"
        />
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-[1fr_16rem]">
      <div>
        <label class="text-[11px] font-bold text-muted">Description</label>
        <UInput
          v-model="draft.description"
          size="sm"
          class="mt-1"
          placeholder="What did you work on?"
        />
      </div>
      <div>
        <label class="text-[11px] font-bold text-muted">Link URL</label>
        <UInput
          v-model="draft.linkUrl"
          size="sm"
          class="mt-1"
          placeholder="Task, ticket, or brief URL"
        />
      </div>
    </div>

    <div>
      <p class="text-[11px] font-bold text-muted">Tags</p>
      <div class="mt-1 flex flex-wrap gap-1.5">
        <UButton
          v-for="tag in tags"
          :key="tag.id"
          :label="tag.name"
          size="xs"
          class="rounded-full"
          :color="draft.tagIds.includes(tag.id) ? 'primary' : 'neutral'"
          :variant="draft.tagIds.includes(tag.id) ? 'soft' : 'ghost'"
          @click="emit('toggleTag', tag.id)"
        />
        <span v-if="tags.length === 0" class="text-xs text-muted">
          No tags yet. Add tags in Agency settings.
        </span>
      </div>
    </div>

    <p v-if="error" class="text-xs text-error">{{ error }}</p>

    <div class="flex items-center justify-end gap-2">
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('cancel')"
      />
      <UButton type="submit" label="Save entry" color="primary" size="sm" :loading="saving" />
    </div>
  </form>
</template>
