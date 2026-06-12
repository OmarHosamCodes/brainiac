<script setup lang="ts">
const props = defineProps<{
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    url: string | null;
  }>;
}>();

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

function isAudio(mimeType: string) {
  return mimeType.startsWith("audio/");
}

function fileIcon(mimeType: string) {
  if (isImage(mimeType)) return "i-lucide-image";
  if (isVideo(mimeType)) return "i-lucide-video";
  if (isAudio(mimeType)) return "i-lucide-music";
  if (mimeType.includes("pdf")) return "i-lucide-file-text";
  return "i-lucide-file";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(attachment: (typeof props.attachments)[number]): string {
  return attachment.url ?? "";
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <template v-for="attachment in attachments" :key="attachment.id">
      <a
        v-if="isImage(attachment.mimeType)"
        :href="fileUrl(attachment)"
        target="_blank"
        rel="noreferrer"
        class="group relative block overflow-hidden rounded-lg border border-default"
      >
        <img
          :src="fileUrl(attachment)"
          :alt="attachment.fileName"
          class="size-24 object-cover transition-transform group-hover:scale-105"
        />
      </a>

      <a
        v-else-if="isVideo(attachment.mimeType)"
        :href="fileUrl(attachment)"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-xs"
      >
        <UIcon :name="fileIcon(attachment.mimeType)" class="size-4 text-muted" />
        <span class="max-w-[8rem] truncate">{{ attachment.fileName }}</span>
        <span class="text-muted">{{ formatSize(attachment.sizeBytes) }}</span>
      </a>

      <a
        v-else
        :href="fileUrl(attachment)"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-xs hover:bg-elevated"
      >
        <UIcon :name="fileIcon(attachment.mimeType)" class="size-4 text-muted" />
        <span class="max-w-[8rem] truncate">{{ attachment.fileName }}</span>
        <span class="text-muted">{{ formatSize(attachment.sizeBytes) }}</span>
      </a>
    </template>
  </div>
</template>
