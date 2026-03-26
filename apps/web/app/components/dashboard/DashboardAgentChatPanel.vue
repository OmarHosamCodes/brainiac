<script setup lang="ts">
import type { WorkspaceNode } from "@brainiac/workspace";
import { nextTick, toRef, useTemplateRef, watch } from "vue";

const props = defineProps<{
    nodes: WorkspaceNode[];
}>();

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
        class="flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-muted/60 bg-default shadow-lg shadow-black/5"
    >
        <div class="border-b border-muted/60 bg-elevated/50 px-5 py-4">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p
                        class="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary"
                    >
                        Agent Chat
                    </p>
                    <h2
                        class="mt-2 text-lg font-semibold tracking-tight text-highlighted"
                    >
                        Workspace-aware copilot
                    </h2>
                    <p class="mt-1 text-sm text-muted">
                        Ask about priorities, gaps, node structure, or what the
                        dashboard is signaling.
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <UBadge color="neutral" variant="subtle">
                        {{ nodes.length }} nodes
                    </UBadge>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        icon="i-lucide-rotate-ccw"
                        :disabled="messages.length === 0 && !draft"
                        @click="resetChat"
                    >
                        Reset
                    </UButton>
                </div>
            </div>
        </div>

        <div
            ref="chatViewport"
            class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-elevated/20 px-4 py-4"
        >
            <template v-if="messages.length === 0">
                <div
                    class="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4"
                >
                    <p class="text-sm font-medium text-highlighted">
                        Start with a concrete question.
                    </p>
                    <p class="mt-1 text-sm text-muted">
                        The agent can inspect live dashboard nodes, search them,
                        and pull node details before answering.
                    </p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <UButton
                        v-for="prompt in promptSuggestions"
                        :key="prompt"
                        color="neutral"
                        variant="soft"
                        size="sm"
                        class="rounded-full"
                        @click="handlePromptClick(prompt)"
                    >
                        {{ prompt }}
                    </UButton>
                </div>
            </template>

            <article
                v-for="message in messages"
                :key="message.id"
                class="flex"
                :class="
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                "
            >
                <div
                    class="max-w-[92%] rounded-[24px] border px-4 py-3 text-sm shadow-sm"
                    :class="
                        message.role === 'user'
                            ? 'border-primary/30 bg-primary/10 text-highlighted'
                            : 'border-muted/70 bg-default text-toned'
                    "
                >
                    <p class="whitespace-pre-wrap leading-6">
                        {{ message.content }}
                    </p>

                    <p
                        v-if="
                            message.role === 'user' &&
                            message.contextNodeTitles?.length
                        "
                        class="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70"
                    >
                        Context · {{ message.contextNodeTitles.join(", ") }}
                    </p>

                    <p
                        v-if="
                            message.role === 'assistant' &&
                            (message.model || message.toolsCalled?.length)
                        "
                        class="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70"
                    >
                        {{ message.model }}
                        <template v-if="message.toolsCalled?.length">
                            · {{ message.toolsCalled.join(", ") }}
                        </template>
                    </p>
                </div>
            </article>

            <article v-if="isPending" class="flex justify-start">
                <div
                    class="flex items-center gap-2 rounded-[24px] border border-muted/70 bg-default px-4 py-3 text-sm text-muted shadow-sm"
                >
                    <UIcon
                        name="i-lucide-loader-2"
                        class="size-4 animate-spin"
                    />
                    Reading the dashboard
                </div>
            </article>
        </div>

        <div class="border-t border-muted/60 bg-default px-4 py-4">
            <UAlert
                v-if="error"
                color="error"
                variant="soft"
                icon="i-lucide-alert-circle"
                title="Agent request failed"
                :description="error"
                class="mb-3"
            />

            <div
                v-if="errorDebugDetails"
                class="mb-3 rounded-2xl border border-error/25 bg-error/5 p-3"
            >
                <p
                    class="text-[11px] font-semibold uppercase tracking-[0.22em] text-error"
                >
                    Dev Debug
                </p>
                <pre
                    class="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-toned"
                    >{{ errorDebugDetails }}</pre
                >
            </div>

            <UAlert
                v-if="modelError"
                color="warning"
                variant="soft"
                icon="i-lucide-cloud-off"
                title="Free model catalog unavailable"
                :description="modelError"
                class="mb-3"
            />

            <div
                v-if="modelDebugDetails"
                class="mb-3 rounded-2xl border border-warning/25 bg-warning/5 p-3"
            >
                <p
                    class="text-[11px] font-semibold uppercase tracking-[0.22em] text-warning"
                >
                    Dev Debug
                </p>
                <pre
                    class="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-toned"
                    >{{ modelDebugDetails }}</pre
                >
            </div>

            <div
                class="rounded-[26px] border border-muted/70 bg-elevated/25 p-3 shadow-sm shadow-black/5"
            >
                <div
                    class="flex flex-col items-start justify-between gap-3 border-b border-muted/60 pb-3"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <UBadge
                            v-if="modelCount > 0"
                            color="neutral"
                            variant="subtle"
                        >
                            {{ modelCount }} free models
                        </UBadge>
                        <UBadge
                            v-if="selectedModel"
                            color="neutral"
                            variant="subtle"
                        >
                            {{ selectedModel.provider }}
                        </UBadge>
                        <UBadge
                            v-if="selectedModel"
                            :color="
                                selectedModel.supportsTools
                                    ? 'primary'
                                    : 'warning'
                            "
                            variant="soft"
                        >
                            {{
                                selectedModel.supportsTools
                                    ? "Tool use"
                                    : "Direct answers"
                            }}
                        </UBadge>
                        <UBadge color="primary" variant="soft">
                            {{ scopeLabel }}
                        </UBadge>
                        <UButton
                            v-if="selectedNodes.length > 0"
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            icon="i-lucide-eraser"
                            @click="clearMentionedNodes"
                        >
                            Clear context
                        </UButton>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p
                            class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted"
                        >
                            Model
                        </p>

                        <USelectMenu
                            v-model="selectedModelId"
                            :items="modelOptions"
                            value-key="id"
                            label-key="label"
                            description-key="description"
                            :filter-fields="[
                                'label',
                                'description',
                                'id',
                                'provider',
                            ]"
                            :loading="isLoadingModels && modelCount === 0"
                            :disabled="modelCount === 0"
                            :search-input="{
                                placeholder: 'Search OpenRouter free models',
                            }"
                            :virtualize="{ estimateSize: 56, overscan: 12 }"
                            color="neutral"
                            variant="subtle"
                            size="lg"
                            class="mt-2 w-full"
                            placeholder="Select a free model"
                        />

                        <p class="mt-2 truncate text-xs text-muted">
                            {{ modelHint }}
                        </p>
                    </div>
                </div>

                <div
                    v-if="selectedNodes.length > 0"
                    class="mt-3 rounded-[22px] border border-primary/15 bg-primary/5 p-3"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <p
                            class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted"
                        >
                            Context
                        </p>

                        <button
                            v-for="node in selectedNodes"
                            :key="node.id"
                            type="button"
                            class="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-default/85 px-3 py-1 text-xs font-medium text-highlighted transition hover:border-primary/40 hover:bg-default"
                            @click="removeMentionedNode(node.id)"
                        >
                            <span>{{ node.title }}</span>
                            <UIcon name="i-lucide-x" class="size-3" />
                        </button>
                    </div>
                </div>

                <UTextarea
                    v-model="draft"
                    :rows="4"
                    autoresize
                    :placeholder="composerPlaceholder"
                    class="mt-3 w-full"
                    @keydown.enter.exact="handleEnterKeydown"
                />

                <div
                    v-if="activeMention"
                    class="mt-3 rounded-[22px] border border-muted/70 bg-default/85 p-2 shadow-sm shadow-black/5"
                >
                    <div
                        class="mb-2 flex items-center justify-between gap-2 px-2"
                    >
                        <p
                            class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted"
                        >
                            Node Matches
                        </p>
                        <p
                            v-if="mentionSuggestions.length > 0"
                            class="text-xs text-muted"
                        >
                            {{ mentionSuggestions.length }} available
                        </p>
                    </div>

                    <div
                        v-if="mentionSuggestions.length > 0"
                        class="flex max-h-56 flex-col gap-1 overflow-y-auto"
                    >
                        <button
                            v-for="node in mentionSuggestions"
                            :key="node.id"
                            type="button"
                            class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-toned transition hover:bg-elevated"
                            @click="handleMentionClick(node)"
                        >
                            <span
                                class="min-w-0 truncate font-medium text-highlighted"
                            >
                                {{ node.title }}
                            </span>
                            <span class="truncate text-xs text-muted">
                                {{ node.label || node.id }}
                            </span>
                        </button>
                    </div>

                    <p v-else class="px-3 py-2 text-sm text-muted">
                        No nodes match
                        <span class="font-medium text-highlighted">{{
                            `@${activeMention.query}`
                        }}</span
                        >.
                    </p>
                </div>

                <div
                    class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-muted/60 pt-3"
                >
                    <UButton
                        color="primary"
                        icon="i-lucide-send"
                        size="lg"
                        class="w-full justify-center rounded-full px-5"
                        :loading="isPending"
                        :disabled="!canSend"
                        @click="handleSubmit"
                    >
                        Send
                    </UButton>
                </div>
            </div>
        </div>
    </section>
</template>
