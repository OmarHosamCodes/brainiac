<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyAttachmentGrid from "~/components/agency/AgencyAttachmentGrid.vue";
import AgencyTaskComposer from "~/components/agency/AgencyTaskComposer.vue";
import AgencyTaskMediaPlayer from "~/components/agency/AgencyTaskMediaPlayer.vue";
import AgencyMiniTimer from "~/components/agency/AgencyMiniTimer.vue";
import { getErrorMessage } from "~/utils/get-error-message";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

const props = defineProps<{
  teamId: string;
  taskId: string;
  projects: Project[];
}>();

const emit = defineEmits<{
  back: [];
}>();

const orpc = useOrpc();
const teamId = computed(() => props.teamId);
const taskId = computed(() => props.taskId);
const agentEnabled = ref(false);
const isDraggingFile = ref(false);

const contextQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.taskThreads.context.get.queryOptions({
      input: { teamId: teamId.value, taskId: taskId.value },
    }),
    enabled: Boolean(teamId.value) && Boolean(taskId.value),
  })),
);

const messagesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.taskThreads.messages.list.queryOptions({
      input: { teamId: teamId.value, taskId: taskId.value, pageSize: 50 },
    }),
    enabled: Boolean(teamId.value) && Boolean(taskId.value),
  })),
);

const messages = computed(() => {
  const items = messagesQuery.data.value?.items ?? [];
  return [...items].reverse();
});

const context = computed(() => contextQuery.data.value);
const isThreadLoading = computed(
  () => contextQuery.isPending.value || messagesQuery.isPending.value,
);
const isThreadError = computed(() => contextQuery.isError.value || messagesQuery.isError.value);
const threadError = computed(() => contextQuery.error.value ?? messagesQuery.error.value);

const project = computed(() => props.projects.find((p) => p.id === context.value?.projectId));

const threadContainer = ref<HTMLElement | null>(null);
const composer = ref<InstanceType<typeof AgencyTaskComposer> | null>(null);

watch(messagesQuery.data, () => {
  nextTick(() => {
    if (threadContainer.value) {
      threadContainer.value.scrollTop = threadContainer.value.scrollHeight;
    }
  });
});

function isAudio(mimeType: string) {
  return mimeType.startsWith("audio/");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function sameDay(left: string, right: string) {
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function onMessageSent() {
  void messagesQuery.refetch();
}

function retryThread() {
  void contextQuery.refetch();
  void messagesQuery.refetch();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("back");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer?.types.includes("Files")) {
    isDraggingFile.value = true;
  }
}

function onDragLeave(event: DragEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
    isDraggingFile.value = false;
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDraggingFile.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    void composer.value?.uploadFiles(Array.from(files));
  }
}
</script>

<template>
  <section
    class="relative flex h-full flex-col rounded-2xl border border-default bg-default"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div
      v-if="isDraggingFile"
      class="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 text-sm font-bold text-primary backdrop-blur-sm"
    >
      Drop files to attach them to this task.
    </div>
    <header class="border-b border-default px-4 py-3">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('back')"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-highlighted">
            {{ context?.taskTitle ?? "Task" }}
          </p>
          <p class="truncate text-xs text-muted">
            {{ project?.clientName ?? "Client" }} · {{ project?.name ?? "Project" }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <AgencyMiniTimer :team-id="teamId" :task-id="taskId" :project-id="context?.projectId" />
          <USwitch v-model="agentEnabled" label="Agent" size="sm" />
        </div>
      </div>
    </header>

    <div v-if="isThreadLoading" class="flex-1 p-4">
      <div
        v-for="rowIndex in 6"
        :key="rowIndex"
        class="mb-3 h-16 animate-pulse rounded-xl bg-elevated/60"
      />
    </div>

    <div
      v-else-if="isThreadError"
      class="flex flex-1 flex-col items-center justify-center p-6 text-center"
    >
      <UIcon name="i-lucide-alert-triangle" class="size-5 text-error" />
      <p class="mt-3 text-sm font-bold text-highlighted">Couldn't load thread.</p>
      <p class="mt-1 text-xs text-muted">
        {{ getErrorMessage(threadError, "Try refreshing.") }}
      </p>
      <UButton
        label="Retry"
        color="neutral"
        variant="soft"
        size="xs"
        class="mt-3"
        @click="retryThread"
      />
    </div>

    <div v-else ref="threadContainer" class="flex-1 space-y-4 overflow-y-auto p-4">
      <div v-if="messages.length === 0" class="py-8 text-center text-xs text-muted">
        No messages yet. Start the thread below.
      </div>

      <template v-for="(message, index) in messages" :key="message.id">
        <div
          v-if="index === 0 || !sameDay(message.createdAt, messages[index - 1]?.createdAt ?? '')"
          class="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted"
        >
          {{ formatDate(message.createdAt) }}
        </div>

        <div
          class="flex gap-3"
          :class="message.senderType === 'agent' ? 'rounded-xl bg-primary/5 p-3' : ''"
        >
          <div
            v-if="message.senderType === 'agent'"
            class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10"
          >
            <UIcon name="i-lucide-bot" class="size-4 text-primary" />
          </div>
          <UAvatar
            v-else
            :src="message.userAvatar ?? undefined"
            :alt="message.userName"
            size="xs"
            :text="message.userName.slice(0, 2)"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span class="text-xs font-bold text-highlighted">{{ message.userName }}</span>
              <span class="text-[11px] text-muted">{{ formatTime(message.createdAt) }}</span>
            </div>

            <div
              v-if="message.type === 'text' || message.content"
              class="mt-1 whitespace-pre-wrap text-sm text-default"
            >
              {{ message.content }}
            </div>

            <div
              v-if="
                message.type === 'voice' || message.attachments.some((a) => isAudio(a.mimeType))
              "
              class="mt-2"
            >
              <AgencyTaskMediaPlayer
                v-for="attachment in message.attachments.filter((a) => isAudio(a.mimeType))"
                :key="attachment.id"
                :src="attachment.url ?? undefined"
                :mime-type="attachment.mimeType"
                :file-name="attachment.fileName"
              />
            </div>

            <AgencyAttachmentGrid
              :attachments="message.attachments.filter((a) => !isAudio(a.mimeType))"
              class="mt-2"
            />
          </div>
        </div>
      </template>
    </div>

    <div class="border-t border-default p-3">
      <AgencyTaskComposer
        ref="composer"
        :team-id="teamId"
        :task-id="taskId"
        :agent-enabled="agentEnabled"
        @sent="onMessageSent"
      />
    </div>
  </section>
</template>
