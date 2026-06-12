<script setup lang="ts">
import AgencyTaskMediaPlayer from "~/components/agency/AgencyTaskMediaPlayer.vue";

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

const viewerAttachment = ref<(typeof props.attachments)[number] | null>(null);
const viewerOpen = computed(() => viewerAttachment.value !== null);

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

function isAudio(mimeType: string) {
  return mimeType.startsWith("audio/");
}

function isHls(attachment: (typeof props.attachments)[number]) {
  const source = fileUrl(attachment).toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const mimeType = attachment.mimeType.toLowerCase();

  return (
    source.endsWith(".m3u8") ||
    mimeType === "application/vnd.apple.mpegurl" ||
    mimeType === "application/x-mpegurl"
  );
}

function isPlayableMedia(attachment: (typeof props.attachments)[number]) {
  return isAudio(attachment.mimeType) || isVideo(attachment.mimeType) || isHls(attachment);
}

function isImageOrVideo(attachment: (typeof props.attachments)[number]) {
  return isImage(attachment.mimeType) || isVideo(attachment.mimeType) || isHls(attachment);
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

function fileUrl(attachment: (typeof props.attachments)[number]): string | null {
  return attachment.url ?? null;
}

function openViewer(attachment: (typeof props.attachments)[number]) {
  viewerAttachment.value = attachment;
}

function closeViewer() {
  viewerAttachment.value = null;
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <template v-for="attachment in attachments" :key="attachment.id">
      <button
        v-if="isImage(attachment.mimeType) && fileUrl(attachment)"
        type="button"
        class="group relative block overflow-hidden rounded-lg border border-default"
        @click="openViewer(attachment)"
      >
        <img
          :src="fileUrl(attachment)"
          :alt="attachment.fileName"
          class="size-24 object-cover transition-transform group-hover:scale-105"
        />
      </button>

      <div
        v-else-if="isImage(attachment.mimeType) && !fileUrl(attachment)"
        class="flex size-24 items-center justify-center rounded-lg border border-default bg-muted"
      >
        <UIcon :name="fileIcon(attachment.mimeType)" class="size-6 text-muted" />
      </div>

      <div v-else-if="isPlayableMedia(attachment)" class="w-full max-w-sm space-y-1.5">
        <AgencyTaskMediaPlayer
          :src="fileUrl(attachment)"
          :mime-type="attachment.mimeType"
          :file-name="attachment.fileName"
        />
        <div class="flex items-center justify-between gap-2">
          <span class="flex min-w-0 items-center gap-2 text-xs text-muted">
            <UIcon :name="fileIcon(attachment.mimeType)" class="size-4 shrink-0" />
            <span class="truncate">{{ attachment.fileName }}</span>
            <span class="shrink-0">{{ formatSize(attachment.sizeBytes) }}</span>
          </span>
          <UButton
            v-if="isImageOrVideo(attachment) && fileUrl(attachment)"
            icon="i-lucide-expand"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="openViewer(attachment)"
            aria-label="Open in viewer"
          />
        </div>
      </div>

      <a
        v-else-if="fileUrl(attachment)"
        :href="fileUrl(attachment)"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-xs hover:bg-elevated"
      >
        <UIcon :name="fileIcon(attachment.mimeType)" class="size-4 text-muted" />
        <span class="max-w-[8rem] truncate">{{ attachment.fileName }}</span>
        <span class="text-muted">{{ formatSize(attachment.sizeBytes) }}</span>
      </a>

      <div
        v-else
        class="flex items-center gap-2 rounded-lg border border-default bg-muted px-3 py-2 text-xs"
      >
        <UIcon :name="fileIcon(attachment.mimeType)" class="size-4 text-muted" />
        <span class="max-w-[8rem] truncate">{{ attachment.fileName }}</span>
      </div>
    </template>
  </div>

  <UModal v-model:open="viewerOpen">
    <template #body>
      <div v-if="viewerAttachment" class="flex items-center justify-center p-2">
        <img
          v-if="isImage(viewerAttachment.mimeType) && fileUrl(viewerAttachment)"
          :src="fileUrl(viewerAttachment)"
          :alt="viewerAttachment.fileName"
          class="max-h-[80vh] max-w-full rounded-lg object-contain"
        />
        <div
          v-else-if="isImage(viewerAttachment.mimeType) && !fileUrl(viewerAttachment)"
          class="flex flex-col items-center gap-2 p-8 text-muted"
        >
          <UIcon :name="fileIcon(viewerAttachment.mimeType)" class="size-8" />
          <p class="text-sm">Attachment unavailable</p>
        </div>
        <div
          v-else-if="isPlayableMedia(viewerAttachment) && fileUrl(viewerAttachment)"
          class="w-full max-w-xl"
        >
          <AgencyTaskMediaPlayer
            :src="fileUrl(viewerAttachment)"
            :mime-type="viewerAttachment.mimeType"
            :file-name="viewerAttachment.fileName"
          />
        </div>
        <div v-else class="flex flex-col items-center gap-2 p-8 text-muted">
          <UIcon :name="fileIcon(viewerAttachment.mimeType)" class="size-8" />
          <p class="text-sm">Attachment unavailable</p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-between">
        <UButton
          v-if="viewerAttachment && fileUrl(viewerAttachment)"
          label="Open original"
          icon="i-lucide-external-link"
          variant="ghost"
          color="neutral"
          :to="fileUrl(viewerAttachment)"
          target="_blank"
          rel="noreferrer"
        />
        <span v-else />
        <UButton label="Close" color="neutral" variant="soft" @click="closeViewer" />
      </div>
    </template>
  </UModal>
</template>
