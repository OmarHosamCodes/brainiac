<script setup lang="ts">
const props = defineProps<{
  content: string;
  mode: "create" | "edit";
  open: boolean;
  title: string;
  valid: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [];
  "update:content": [value: string];
  "update:title": [value: string];
}>();

const modalTitle = computed(() => (props.mode === "create" ? "Create node" : "Edit node"));
const modalDescription = computed(() =>
  props.mode === "create"
    ? "Define the title and content for a new workspace node."
    : "Update the selected node without leaving the canvas.",
);

function handleOpenChange(isOpen: boolean) {
  if (!isOpen) {
    emit("close");
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{
      content: 'sm:max-w-lg',
      body: 'space-y-4',
      footer: 'flex items-center justify-end gap-3',
    }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <UFormField label="Title" name="title" required>
        <UInput
          :model-value="title"
          placeholder="Strategy lane"
          autofocus
          @update:model-value="emit('update:title', $event ?? '')"
        />
      </UFormField>

      <UFormField
        label="Content"
        name="content"
        description="Keep it concise enough to scan while navigating the board."
      >
        <UTextarea
          :model-value="content"
          :rows="7"
          autoresize
          placeholder="Capture the idea, reminder, or workflow step for this node."
          @update:model-value="emit('update:content', $event ?? '')"
        />
      </UFormField>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="emit('close')">Cancel</UButton>
      <UButton :disabled="!valid" icon="i-lucide-save" @click="emit('submit')">
        {{ mode === "create" ? "Create node" : "Save changes" }}
      </UButton>
    </template>
  </UModal>
</template>
