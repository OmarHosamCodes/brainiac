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
    ? "Create the node title and optional board summary. Tabs and blocks are managed inside the node page."
    : "Update the selected node title or summary without leaving the canvas.",
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

      <UFormField label="Summary" name="content" description="Optional board preview text.">
        <UTextarea
          :model-value="content"
          :rows="7"
          autoresize
          placeholder="Add a short summary for the canvas card."
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
