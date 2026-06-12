<script setup lang="ts">
const props = defineProps<{
  src: string | null | undefined;
  mimeType: string;
  fileName?: string;
  compact?: boolean;
}>();

const source = computed(() => props.src ?? "");
const label = computed(() => props.fileName ?? "Task attachment");
const isHls = computed(() => {
  const normalizedSource = source.value.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const normalizedMimeType = props.mimeType.toLowerCase();

  return (
    normalizedSource.endsWith(".m3u8") ||
    normalizedMimeType === "application/vnd.apple.mpegurl" ||
    normalizedMimeType === "application/x-mpegurl"
  );
});
const isAudio = computed(() => props.mimeType.startsWith("audio/") && !isHls.value);
const isVideo = computed(() => props.mimeType.startsWith("video/") || isHls.value);
</script>

<template>
  <div v-if="source" class="agency-task-media-player" :class="{ 'is-compact': compact }">
    <audio-player v-if="isAudio">
      <audio-skin>
        <audio slot="media" :src="source" :aria-label="label" preload="metadata" />
      </audio-skin>
    </audio-player>

    <video-player v-else-if="isVideo">
      <video-skin>
        <hls-video
          v-if="isHls"
          slot="media"
          :src="source"
          :aria-label="label"
          preload="metadata"
          playsinline
        />
        <video
          v-else
          slot="media"
          :src="source"
          :aria-label="label"
          preload="metadata"
          playsinline
        />
      </video-skin>
    </video-player>
  </div>
</template>
