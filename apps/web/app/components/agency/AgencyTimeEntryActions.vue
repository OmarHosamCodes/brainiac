<script setup lang="ts">
defineProps<{
  entry: { id: string; projectName: string };
  deleting?: boolean;
}>();

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
      :aria-label="`Edit ${entry.projectName} entry`"
      @click="emit('edit')"
    />
    <UButton
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-play"
      :aria-label="`Restart timer for ${entry.projectName}`"
      @click="emit('restart')"
    />
    <UButton
      color="error"
      variant="ghost"
      size="xs"
      icon="i-lucide-trash-2"
      :loading="deleting"
      :aria-label="`Delete ${entry.projectName} entry`"
      @click="emit('delete')"
    />
  </div>
</template>
