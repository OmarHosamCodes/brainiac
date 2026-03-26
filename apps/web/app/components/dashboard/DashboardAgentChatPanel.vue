<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { nextTick, toRef, useTemplateRef, watch } from "vue";

const props = defineProps<{
    nodes: WorkspaceNode[];
}>();

defineEmits(["close"]);

const chatViewport = useTemplateRef<HTMLDivElement>("chatViewport");
const {
    addMentionedNode,
    activeMention,
    canSend,
    clearMentionedNodes,
    composerPlaceholder,
    draft,
    error,
    errorDebugDetails,
    isLoadingModels,
    isPending,
    mentionSuggestions,
    messages,
    modelCount,
    modelDebugDetails,
    modelError,
    modelHint,
    modelOptions,
    promptSuggestions,
    removeMentionedNode,
    resetChat,
    scopeLabel,
    selectedModel,
    selectedModelId,
    selectedNodes,
    sendMessage,
} = useDashboardAgentChat(toRef(props, "nodes"));

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

function handleMentionClick(node: WorkspaceNode) {
    addMentionedNode(node);
}

function handleEnterKeydown(event: KeyboardEvent) {
    event.preventDefault();
    handleSubmit();
}

watch(
    () => [messages.value.length, isPending.value],
    () => {
        void scrollToBottom();
    },
);
</script>

<template>
    <section
        class="flex h-full flex-col overflow-hidden rounded-[2rem] border border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-2xl shadow-2xl ring-1 ring-black/[0.03] dark:ring-white/[0.02]"
    >
        <div
            class="flex items-center justify-between px-6 py-5 border-b border-neutral-200/30 dark:border-neutral-800/30"
        >
            <div class="flex items-center gap-3">
                <div
                    class="flex size-8 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                >
                    <UIcon name="i-lucide-sparkles" class="size-4" />
                </div>
                <div>
                    <h2
                        class="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
                    >
                        Copilot
                    </h2>
                    <p
                        class="text-[10px] font-medium text-neutral-500 uppercase tracking-widest"
                    >
                        {{ scopeLabel }}
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-1">
                <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-rotate-ccw"
                    class="rounded-full"
                    :disabled="messages.length === 0 && !draft"
                    @click="resetChat"
                />
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
            class="flex-1 flex flex-col gap-6 overflow-y-auto px-6 py-6 scroll-smooth"
        >
            <template v-if="messages.length === 0">
                <div class="space-y-6">
                    <div
                        class="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-800/50"
                    >
                        <p
                            class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1"
                        >
                            How can I help?
                        </p>
                        <p class="text-xs text-neutral-500 leading-relaxed">
                            I can analyze your nodes, find connections, or help
                            you brainstorm new ideas.
                        </p>
                    </div>

                    <div class="space-y-2">
                        <p
                            class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1"
                        >
                            Suggestions
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="prompt in promptSuggestions"
                                :key="prompt"
                                type="button"
                                class="px-4 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:border-primary-500/50 hover:text-primary-600 transition-all active:scale-95 shadow-sm text-start"
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
                            ? 'rounded-[1.5rem] rounded-tr-none bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 shadow-xl shadow-black/5'
                            : 'rounded-[1.5rem] rounded-tl-none bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 text-neutral-800 dark:text-neutral-200 shadow-xl shadow-black/5',
                    ]"
                >
                    <p class="whitespace-pre-wrap">{{ message.content }}</p>
                </div>

                <div
                    v-if="
                        message.role === 'user' &&
                        message.contextNodeTitles?.length
                    "
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
            </div>

            <div v-if="isPending" class="flex justify-start">
                <div
                    class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl text-xs text-neutral-500"
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
            class="p-6 border-t border-neutral-200/30 dark:border-neutral-800/30 bg-neutral-50/50 dark:bg-neutral-900/20"
        >
            <div class="relative">
                <UTextarea
                    v-model="draft"
                    :rows="2"
                    autoresize
                    :placeholder="composerPlaceholder"
                    variant="none"
                    class="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm pr-12"
                    @keydown.enter.exact="handleEnterKeydown"
                />

                <UButton
                    size="sm"
                    icon="i-lucide-arrow-up"
                    color="primary"
                    class="absolute right-2 bottom-2 rounded-2xl size-10 flex items-center justify-center p-0 shadow-lg shadow-primary-500/20"
                    :loading="isPending"
                    :disabled="!canSend"
                    @click="handleSubmit"
                />
            </div>

            <div class="mt-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-2 overflow-hidden">
                    <USelectMenu
                        v-model="selectedModelId"
                        :items="modelOptions"
                        value-key="id"
                        label-key="label"
                        class="w-32 shrink-0"
                        :virtualize="{ estimateSize: 32 }"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        :ui="{
                            base: 'text-[10px] font-bold uppercase tracking-widest text-neutral-400 bg-transparent border-none p-0 h-auto',
                        }"
                    />
                </div>

                <div v-if="selectedNodes.length > 0" class="flex -space-x-2">
                    <div
                        v-for="node in selectedNodes.slice(0, 3)"
                        :key="node.id"
                        class="size-5 rounded-full border border-white dark:border-neutral-950 bg-primary-500 flex items-center justify-center text-[8px] text-white font-bold"
                        :title="node.title"
                    >
                        {{ node.title.charAt(0) }}
                    </div>
                    <div
                        v-if="selectedNodes.length > 3"
                        class="size-5 rounded-full border border-white dark:border-neutral-950 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[8px] text-neutral-500 font-bold"
                    >
                        +{{ selectedNodes.length - 3 }}
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Custom Scrollbar for a cleaner look */
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
