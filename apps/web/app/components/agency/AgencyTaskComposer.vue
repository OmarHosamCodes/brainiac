<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";

import AgencyVoiceRecorder from "~/components/agency/AgencyVoiceRecorder.vue";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  teamId: string;
  taskId: string;
  agentEnabled: boolean;
}>();

const emit = defineEmits<{
  sent: [];
}>();

const orpc = useOrpc();
const toast = useToast();

const content = ref("");
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

type PendingAttachment = {
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  url: string;
  uploadToken: string;
  durationSeconds: number | null;
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    durationSeconds?: number;
    fileExtension?: string;
    lastModified?: string;
    mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other";
  };
};

const pendingAttachments = ref<PendingAttachment[]>([]);

const createMessageMutation = useMutation(
  orpc.agencyOps.taskThreads.messages.create.mutationOptions({
    onSuccess: () => {
      content.value = "";
      pendingAttachments.value = [];
      emit("sent");
    },
    onError: (error) => {
      toast.add({
        title: "Couldn't send message",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    },
  }),
);

const askAgentMutation = useMutation(
  orpc.agencyOps.taskAgent.ask.mutationOptions({
    onSuccess: (result) => {
      content.value = "";
      pendingAttachments.value = [];
      emit("sent");
      toast.add({
        title: "Agent",
        description: result.response.slice(0, 120),
        color: "primary",
      });
    },
    onError: (error) => {
      toast.add({
        title: "Agent error",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    },
  }),
);

const createAttachmentMutation = useMutation(
  orpc.agencyOps.taskThreads.attachments.create.mutationOptions(),
);

const isBusy = computed(
  () => createMessageMutation.isPending.value || askAgentMutation.isPending.value,
);

async function send() {
  const text = content.value.trim();
  if (!text && pendingAttachments.value.length === 0) return;

  if (props.agentEnabled) {
    await askAgentMutation.mutateAsync({
      teamId: props.teamId,
      taskId: props.taskId,
      content: text || "What do you think?",
      attachments:
        pendingAttachments.value.length > 0
          ? pendingAttachments.value.map((a) => ({
              fileName: a.fileName,
              mimeType: a.mimeType,
              storageKey: a.storageKey,
              sizeBytes: a.sizeBytes,
              durationSeconds: a.durationSeconds ?? undefined,
              uploadToken: a.uploadToken,
              metadata: a.metadata,
            }))
          : undefined,
    });
    return;
  }

  await createMessageMutation.mutateAsync({
    teamId: props.teamId,
    taskId: props.taskId,
    content: text,
    type:
      pendingAttachments.value.length > 0 &&
      pendingAttachments.value.every((a) => a.durationSeconds !== null)
        ? "voice"
        : pendingAttachments.value.length > 0
          ? "attachment"
          : "text",
    attachments: pendingAttachments.value.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      storageKey: a.storageKey,
      sizeBytes: a.sizeBytes,
      durationSeconds: a.durationSeconds ?? undefined,
      uploadToken: a.uploadToken,
      metadata: a.metadata,
    })),
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void send();
  }
}

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files) {
    void uploadFiles(Array.from(files));
  }
  target.value = "";
}

async function captureFileMetadata(file: File): Promise<{
  imageWidth?: number;
  imageHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  durationSeconds?: number;
  fileExtension?: string;
  lastModified?: string;
  mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other";
}> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const meta: Record<string, unknown> = {
    fileExtension: ext,
    lastModified: new Date(file.lastModified).toISOString(),
  };

  if (file.type.startsWith("image/")) {
    meta.mediaKind = "image";
    try {
      const data = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        img.src = url;
      });
      meta.imageWidth = data.width;
      meta.imageHeight = data.height;
    } catch {
      // metadata capture failed, proceed without it
    }
  } else if (file.type.startsWith("video/")) {
    meta.mediaKind = "video";
    try {
      const data = await new Promise<{
        width: number;
        height: number;
        duration: number;
      }>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        const url = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
          });
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load video metadata"));
        };
        video.src = url;
      });
      meta.videoWidth = data.width;
      meta.videoHeight = data.height;
      meta.durationSeconds = data.duration;
    } catch {
      // metadata capture failed
    }
  } else if (file.type.startsWith("audio/")) {
    meta.mediaKind = "audio";
  } else if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    meta.mediaKind = "archive";
  } else {
    meta.mediaKind = "document";
  }

  return meta as typeof meta & {
    imageWidth?: number;
    imageHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    durationSeconds?: number;
    fileExtension?: string;
    lastModified?: string;
    mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other";
  };
}

async function uploadFiles(files: File[], options: { durationSeconds?: number | null } = {}) {
  for (const file of files) {
    try {
      const metadata = await captureFileMetadata(file);
      if (options.durationSeconds != null) {
        metadata.durationSeconds = options.durationSeconds;
        metadata.mediaKind = "audio";
      }

      const result = await createAttachmentMutation.mutateAsync({
        teamId: props.teamId,
        taskId: props.taskId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      pendingAttachments.value.push({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        storageKey: result.storageKey,
        sizeBytes: file.size,
        url: result.publicUrl,
        uploadToken: result.uploadToken,
        durationSeconds: options.durationSeconds ?? null,
        metadata,
      });
    } catch (error) {
      toast.add({
        title: "Upload failed",
        description: getErrorMessage(error, "Try again."),
        color: "error",
      });
    }
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files) {
    void uploadFiles(Array.from(files));
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function removeAttachment(index: number) {
  pendingAttachments.value.splice(index, 1);
}

function onVoiceRecorded(file: File, durationSeconds: number) {
  void uploadFiles([file], { durationSeconds });
}

defineExpose({ uploadFiles });
</script>

<template>
  <div
    class="relative rounded-xl border border-default bg-muted/30 p-2 transition-colors"
    :class="isDragging ? 'border-primary bg-primary/5' : ''"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <UTextarea
      v-model="content"
      :placeholder="agentEnabled ? 'Ask the agent about this task...' : 'Write a message...'"
      size="sm"
      autoresize
      :rows="1"
      :maxrows="6"
      class="w-full"
      :disabled="isBusy"
      @keydown="onKeydown"
    />

    <div v-if="pendingAttachments.length > 0" class="mt-2 flex flex-wrap gap-2">
      <UBadge
        v-for="(attachment, index) in pendingAttachments"
        :key="attachment.storageKey"
        color="primary"
        variant="soft"
        class="max-w-full gap-1"
      >
        <span class="truncate">{{ attachment.fileName }}</span>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="link"
          size="xs"
          class="p-0"
          @click="removeAttachment(index)"
        />
      </UBadge>
    </div>

    <div class="mt-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-paperclip"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="isBusy"
          @click="fileInput?.click()"
        />
        <input ref="fileInput" type="file" multiple class="hidden" @change="onFileSelect" />
        <AgencyVoiceRecorder :disabled="isBusy" @recorded="onVoiceRecorded" />
      </div>

      <UButton
        :icon="agentEnabled ? 'i-lucide-bot' : 'i-lucide-send'"
        color="primary"
        size="sm"
        :loading="isBusy"
        :disabled="(!content.trim() && pendingAttachments.length === 0) || isBusy"
        @click="send"
      >
        {{ agentEnabled ? "Ask" : "Send" }}
      </UButton>
    </div>
  </div>
</template>
