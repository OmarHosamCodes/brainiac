<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    entry: { id: string; projectName: string; taskTitle?: string | null };
    canRestart?: boolean;
    deleting?: boolean;
  }>(),
  {
    canRestart: true,
    deleting: false,
  },
);

const entryLabel = computed(() => props.entry.taskTitle || props.entry.projectName);

const emit = defineEmits<{
  edit: [];
  restart: [];
  delete: [];
}>();
</script>

<template>
  <div class="flex shrink-0 items-center gap-1.5">
    <UButton
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-pencil"
      :aria-label="`Edit ${entryLabel} entry`"
      @click="emit('edit')"
    />
    <UButton
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-play"
      :disabled="!props.canRestart"
      :aria-label="`Restart timer for ${entryLabel}`"
      @click="emit('restart')"
    />
    <UButton
      color="error"
      variant="ghost"
      size="xs"
      icon="i-lucide-trash-2"
      :loading="props.deleting"
      :aria-label="`Delete ${entryLabel} entry`"
      @click="emit('delete')"
    />
  </div>
</template>
