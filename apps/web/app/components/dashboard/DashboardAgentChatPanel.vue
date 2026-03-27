<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { computed, nextTick, toRef, useTemplateRef, watch } from "vue";

const props = defineProps<{
    nodes: WorkspaceNode[];
}>();

defineEmits(["close"]);

const chatViewport = useTemplateRef<HTMLDivElement>("chatViewport");
const {
    activeConversationId,
    activeConversationTitle,
    activeMention,
    activeToolPresetLabel,
    addMentionedNode,
    canDeleteConversation,
    canRenameConversation,
    canSend,
    closeDeleteDialog,
    closeRenameDialog,
    composerPlaceholder,
    confirmDeleteConversation,
    conversationOptions,
    draft,
    error,
    hasConversations,
    isDeleteDialogOpen,
    isDeletingConversation,
    isLoadingConversation,
    isPending,
    isRenameDialogOpen,
    isRenamingConversation,
    mentionSuggestions,
    messages,
    modelOptions,
    openDeleteDialog,
    openRenameDialog,
    promptSuggestions,
    renameDraft,
    scopeLabel,
    selectedModelId,
    selectedNodes,
    selectedToolPreset,
    sendMessage,
    startNewConversation,
    submitRenameConversation,
    toolPresetOptions,
} = useDashboardAgentChat(toRef(props, "nodes"));

const conversationSelection = computed({
    get: () => activeConversationId.value ?? undefined,
    set: (value: string | undefined) => {
        activeConversationId.value = value ?? null;
    },
});

async function scrollToBottom() {
    await nextTick();
    const element = chatViewport.value;

    if (!element) {
        return;
    }

    element.scrollTop = element.scrollHeight;
}

function handleSubmit() {
    if (activeMention.value && mentionSuggestions.value.length > 0) {
        const firstSuggestion = mentionSuggestions.value[0];

        if (firstSuggestion) {
            addMentionedNode(firstSuggestion);
        }
    }

    void sendMessage();
}

function handlePromptClick(prompt: string) {
    void sendMessage(prompt);
}

function handleEnterKeydown(event: KeyboardEvent) {
    event.preventDefault();
    handleSubmit();
}

watch(
    () => [messages.value.length, isPending.value, isLoadingConversation.value],
    () => {
        void scrollToBottom();
    },
);
</script>

<template>
    <section
        class="flex h-full flex-col overflow-hidden rounded-[2rem] border border-neutral-200/50 bg-white/80 shadow-2xl ring-1 ring-black/[0.03] backdrop-blur-2xl dark:border-neutral-800/50 dark:bg-neutral-950/80 dark:ring-white/[0.02]"
    >
        <div
            class="flex items-start justify-between gap-3 border-b border-neutral-200/30 px-5 py-5 dark:border-neutral-800/30"
        >
            <div class="min-w-0 flex-1 space-y-3">
                <div class="flex items-center gap-3">
                    <div
                        class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    >
                        <UIcon name="i-lucide-sparkles" class="size-4" />
                    </div>

                    <div class="min-w-0 flex-1">
                        <USelectMenu
                            v-model="conversationSelection"
                            :items="conversationOptions"
                            value-key="id"
                            label-key="label"
                            placeholder="New conversation"
                            class="w-full"
                            :disabled="!hasConversations"
                            size="sm"
                            variant="ghost"
                            color="neutral"
                            :ui="{
                                base: 'w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-3 py-2 text-left text-sm font-semibold text-neutral-900 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-100',
                                trailingIcon: 'text-neutral-400',
                            }"
                        />
                        <div class="mt-1 flex items-center gap-2 px-1">
                            <span
                                class="rounded-full bg-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300"
                            >
                                {{ activeToolPresetLabel }}
                            </span>
                            <p class="truncate text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                                {{ scopeLabel }}
                            </p>
                        </div>
                    </div>
                </div>

                <div v-if="hasConversations" class="space-y-1 rounded-2xl bg-neutral-50/80 p-3 dark:bg-neutral-900/40">
                    <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                        Recent
                    </p>
                    <button
                        v-for="conversation in conversationOptions.slice(0, 3)"
                        :key="conversation.id"
                        type="button"
                        class="flex w-full flex-col rounded-2xl px-2 py-2 text-left transition hover:bg-white/80 dark:hover:bg-neutral-950/70"
                        :class="conversation.id === activeConversationId ? 'bg-white shadow-sm dark:bg-neutral-950/70' : ''"
                        @click="conversationSelection = conversation.id"
                    >
                        <span class="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            {{ conversation.label }}
                        </span>
                        <span class="truncate text-[11px] text-neutral-500">
                            {{ conversation.preview }}
                        </span>
                        <span class="text-[10px] uppercase tracking-widest text-neutral-400">
                            {{ conversation.meta }}
                        </span>
                    </button>
                </div>
            </div>

            <div class="flex items-center gap-1">
                <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-square-pen"
                    class="rounded-full"
                    @click="startNewConversation"
                />
                <UDropdownMenu
                    :items="[
                        [
                            {
                                label: 'Rename conversation',
                                icon: 'i-lucide-pencil-line',
                                disabled: !canRenameConversation,
                                onSelect: openRenameDialog,
                            },
                            {
                                label: 'Delete conversation',
                                icon: 'i-lucide-trash-2',
                                disabled: !canDeleteConversation,
                                onSelect: openDeleteDialog,
                            },
                        ],
                    ]"
                >
                    <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-ellipsis"
                        class="rounded-full"
                        :disabled="!canRenameConversation && !canDeleteConversation"
                    />
                </UDropdownMenu>
                <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-x"
                    class="rounded-full"
                    @click="$emit('close')"
                />
            </div>
        </div>

        <div
            ref="chatViewport"
            class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 scroll-smooth"
        >
            <template v-if="messages.length === 0 && !isLoadingConversation">
                <div class="space-y-6">
                    <div
                        class="rounded-3xl border border-neutral-200/50 bg-neutral-50 p-5 dark:border-neutral-800/50 dark:bg-neutral-900/50"
                    >
                        <p
                            class="mb-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                        >
                            {{ activeConversationTitle }}
                        </p>
                        <p class="text-xs leading-relaxed text-neutral-500">
                            {{
                                hasConversations
                                    ? "Switch between saved conversations or start a new one from the header."
                                    : "Start your first conversation. I can analyze nodes, find connections, and help you plan next steps."
                            }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <p
                            class="ml-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400"
                        >
                            Suggestions
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="prompt in promptSuggestions"
                                :key="prompt"
                                type="button"
                                class="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-start text-xs font-medium text-neutral-600 shadow-sm transition-all hover:border-primary-500/50 hover:text-primary-600 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                                @click="handlePromptClick(prompt)"
                            >
                                {{ prompt }}
                            </button>
                        </div>
                    </div>
                </div>
            </template>

            <div
                v-for="message in messages"
                :key="message.id"
                class="flex flex-col gap-2"
                :class="message.role === 'user' ? 'items-end' : 'items-start'"
            >
                <div
                    class="max-w-[85%] px-5 py-3.5 text-sm leading-relaxed"
                    :class="[
                        message.role === 'user'
                            ? 'rounded-[1.5rem] rounded-tr-none bg-neutral-900 text-neutral-100 shadow-xl shadow-black/5 dark:bg-neutral-100 dark:text-neutral-900'
                            : 'rounded-[1.5rem] rounded-tl-none border border-neutral-200/50 bg-white text-neutral-800 shadow-xl shadow-black/5 dark:border-neutral-800/50 dark:bg-neutral-900 dark:text-neutral-200',
                    ]"
                >
                    <p class="whitespace-pre-wrap">{{ message.content }}</p>
                </div>

                <div
                    v-if="message.contextNodeTitles?.length"
                    class="flex flex-wrap gap-1 px-1"
                >
                    <span
                        v-for="title in message.contextNodeTitles"
                        :key="title"
                        class="text-[9px] font-bold uppercase tracking-widest text-neutral-400"
                    >
                        · {{ title }}
                    </span>
                </div>

                <div
                    v-if="message.role === 'assistant' && (message.model || message.toolsCalled.length > 0)"
                    class="flex flex-wrap gap-2 px-1 text-[10px] font-medium uppercase tracking-widest text-neutral-400"
                >
                    <span v-if="message.model">{{ message.model }}</span>
                    <span v-for="toolName in message.toolsCalled" :key="toolName">
                        {{ toolName }}
                    </span>
                </div>
            </div>

            <div v-if="isLoadingConversation" class="flex justify-start">
                <div
                    class="rounded-2xl border border-neutral-200/50 bg-white px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800/50 dark:bg-neutral-900"
                >
                    Loading conversation...
                </div>
            </div>

            <div v-if="isPending" class="flex justify-start">
                <div
                    class="flex items-center gap-2 rounded-2xl border border-neutral-200/50 bg-white px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800/50 dark:bg-neutral-900"
                >
                    <UIcon
                        name="i-lucide-loader-2"
                        class="size-3 animate-spin text-primary-500"
                    />
                    Thinking...
                </div>
            </div>
        </div>

        <div
            class="border-t border-neutral-200/30 bg-neutral-50/50 p-6 dark:border-neutral-800/30 dark:bg-neutral-900/20"
        >
            <div class="relative">
                <UTextarea
                    v-model="draft"
                    :rows="2"
                    autoresize
                    :placeholder="composerPlaceholder"
                    variant="none"
                    class="w-full rounded-3xl border border-neutral-200 bg-white px-5 py-4 pr-12 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-800 dark:bg-neutral-900"
                    @keydown.enter.exact="handleEnterKeydown"
                />

                <UButton
                    size="sm"
                    icon="i-lucide-arrow-up"
                    color="primary"
                    class="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-2xl p-0 shadow-lg shadow-primary-500/20"
                    :loading="isPending"
                    :disabled="!canSend"
                    @click="handleSubmit"
                />
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="min-w-0">
                    <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                        Mode
                    </p>
                    <USelectMenu
                        v-model="selectedToolPreset"
                        :items="toolPresetOptions"
                        value-key="value"
                        label-key="label"
                        size="xs"
                        class="w-full"
                    />
                </div>

                <div class="min-w-0">
                    <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                        Model
                    </p>
                    <USelectMenu
                        v-model="selectedModelId"
                        :items="modelOptions"
                        value-key="id"
                        label-key="label"
                        class="w-full"
                        :virtualize="{ estimateSize: 32 }"
                        size="xs"
                    />
                </div>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
                <p class="min-w-0 truncate text-[11px] text-neutral-500">
                    {{ modelOptions.find((item) => item.id === selectedModelId)?.description || "Using the default model." }}
                </p>

                <div v-if="selectedNodes.length > 0" class="flex -space-x-2">
                    <div
                        v-for="node in selectedNodes.slice(0, 3)"
                        :key="node.id"
                        class="flex size-5 items-center justify-center rounded-full border border-white bg-primary-500 text-[8px] font-bold text-white dark:border-neutral-950"
                        :title="node.title"
                    >
                        {{ node.title.charAt(0) }}
                    </div>
                    <div
                        v-if="selectedNodes.length > 3"
                        class="flex size-5 items-center justify-center rounded-full border border-white bg-neutral-200 text-[8px] font-bold text-neutral-500 dark:border-neutral-950 dark:bg-neutral-800"
                    >
                        +{{ selectedNodes.length - 3 }}
                    </div>
                </div>
            </div>

            <UAlert
                v-if="error"
                class="mt-4 rounded-2xl"
                color="error"
                variant="soft"
                icon="i-lucide-alert-circle"
                title="Copilot error"
                :description="error"
            />
        </div>

        <UModal
            :open="isRenameDialogOpen"
            title="Rename conversation"
            description="Update the title shown in your conversation history."
            :ui="{
                content: 'sm:max-w-md rounded-[28px] overflow-hidden',
                body: 'space-y-4 p-6',
                footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-5',
            }"
            @update:open="(value) => !value && closeRenameDialog()"
        >
            <template #body>
                <UFormField label="Title">
                    <UInput
                        v-model="renameDraft"
                        class="w-full"
                        maxlength="80"
                        placeholder="Conversation title"
                    />
                </UFormField>
            </template>

            <template #footer>
                <UButton color="neutral" variant="ghost" @click="closeRenameDialog">
                    Cancel
                </UButton>
                <UButton
                    color="primary"
                    icon="i-lucide-check"
                    :loading="isRenamingConversation"
                    :disabled="renameDraft.trim().length === 0"
                    @click="submitRenameConversation"
                >
                    Save
                </UButton>
            </template>
        </UModal>

        <UModal
            :open="isDeleteDialogOpen"
            title="Delete conversation"
            description="This permanently removes the conversation and all of its messages."
            :ui="{
                content: 'sm:max-w-md rounded-[28px] overflow-hidden',
                body: 'space-y-4 p-6',
                footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-5',
            }"
            @update:open="(value) => !value && closeDeleteDialog()"
        >
            <template #body>
                <div class="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-neutral-600 dark:text-neutral-300">
                    <p class="font-semibold text-neutral-900 dark:text-neutral-100">
                        {{ activeConversationTitle }}
                    </p>
                    <p class="mt-1">
                        This action cannot be undone.
                    </p>
                </div>
            </template>

            <template #footer>
                <UButton color="neutral" variant="ghost" @click="closeDeleteDialog">
                    Cancel
                </UButton>
                <UButton
                    color="error"
                    icon="i-lucide-trash-2"
                    :loading="isDeletingConversation"
                    @click="confirmDeleteConversation"
                >
                    Delete
                </UButton>
            </template>
        </UModal>
    </section>
</template>

<style scoped>
::-webkit-scrollbar {
    width: 4px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
}

.dark ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
}
</style>
