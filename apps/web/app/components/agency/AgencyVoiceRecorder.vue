<script setup lang="ts">
import AgencyTaskMediaPlayer from "~/components/agency/AgencyTaskMediaPlayer.vue";

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  recorded: [file: File, durationSeconds: number];
}>();

const isRecording = ref(false);
const recordedBlob = ref<Blob | null>(null);
const recordedUrl = ref("");
const recordingSeconds = ref(0);

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let timerHandle: ReturnType<typeof setInterval> | null = null;

async function startRecording() {
  if (props.disabled) return;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  chunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    recordedBlob.value = blob;
    recordedUrl.value = URL.createObjectURL(blob);
    stopTimer();
  };

  mediaRecorder.start();
  isRecording.value = true;
  recordingSeconds.value = 0;
  timerHandle = setInterval(() => {
    recordingSeconds.value += 1;
  }, 1_000);
}

function stopRecording() {
  mediaRecorder?.stop();
  mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
  isRecording.value = false;
}

function stopTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function sendRecording() {
  if (!recordedBlob.value) return;
  const file = new File([recordedBlob.value], `voice-${Date.now()}.webm`, {
    type: "audio/webm",
  });
  emit("recorded", file, recordingSeconds.value);
  discardRecording();
}

function discardRecording() {
  recordedBlob.value = null;
  recordedUrl.value = "";
  recordingSeconds.value = 0;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

onBeforeUnmount(() => {
  stopRecording();
  stopTimer();
});
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <UButton
      v-if="!isRecording && !recordedUrl"
      icon="i-lucide-mic"
      color="neutral"
      variant="ghost"
      size="xs"
      :disabled="disabled"
      @click="startRecording"
    />

    <template v-else-if="isRecording">
      <span class="text-xs tabular-nums text-error">{{ formatDuration(recordingSeconds) }}</span>
      <UButton
        icon="i-lucide-square"
        color="error"
        variant="soft"
        size="xs"
        @click="stopRecording"
      />
    </template>

    <template v-else-if="recordedUrl">
      <AgencyTaskMediaPlayer
        :src="recordedUrl"
        mime-type="audio/webm"
        file-name="Recorded voice message"
        compact
      />
      <UButton
        icon="i-lucide-send"
        color="primary"
        variant="soft"
        size="xs"
        @click="sendRecording"
      />
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="discardRecording"
      />
    </template>
  </div>
</template>
