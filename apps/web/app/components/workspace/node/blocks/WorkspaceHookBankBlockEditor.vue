<script setup lang="ts">
import {
  buildHookBankGenerationPrompt,
  createWorkspaceHookBankItem,
  getHookBankSummary,
  sortHookBankItems,
  type WorkspaceHookBankBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceHookBankBlock;
  tabId: string;
}>();

const toast = useToast();
const { mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();

const summary = computed(() => getHookBankSummary(props.block));
const sortedHooks = computed(() => sortHookBankItems(props.block.hooks));
const isGenerating = ref(false);

function addHook() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "hook-bank") {
      return;
    }

    block.hooks.unshift(
      createWorkspaceHookBankItem({
        category: "",
        text: "",
        score: 5,
      }),
    );
  });
}

function removeHook(hookId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "hook-bank") {
      return;
    }

    block.hooks = block.hooks.filter((hook) => hook.id !== hookId);
  });
}

function mutateHook(
  hookId: string,
  mutator: (hook: WorkspaceHookBankBlock["hooks"][number]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "hook-bank") {
      return;
    }

    const target = block.hooks.find((hook) => hook.id === hookId);

    if (!target) {
      return;
    }

    mutator(target);
  });
}

function setHookScore(hookId: string, score: number) {
  mutateHook(hookId, (hook) => {
    hook.score = score;
  });
}

function parseHookPayload(content: string) {
  const candidates = [
    content.trim(),
    ...[...content.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(
      (match) => match[1]?.trim() ?? "",
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as
        | { hooks?: Array<{ category?: string; text?: string; score?: number }> }
        | Array<{ category?: string; text?: string; score?: number }>;
      const hooks = Array.isArray(parsed) ? parsed : parsed.hooks;

      if (!Array.isArray(hooks)) {
        continue;
      }

      return hooks
        .map((hook) =>
          createWorkspaceHookBankItem({
            category: String(hook.category ?? "").slice(0, 40),
            text: String(hook.text ?? "").slice(0, 320),
            score: Math.min(10, Math.max(1, Math.round(Number(hook.score ?? 5)))),
          }),
        )
        .filter((hook) => hook.text.trim().length > 0)
        .slice(0, 5);
    } catch {}
  }

  return [];
}

async function generateHooks() {
  isGenerating.value = true;

  try {
    const response = await runBlockAgentPrompt(
      props.tabId,
      props.block.id,
      buildHookBankGenerationPrompt(props.block),
    );
    const generatedHooks = parseHookPayload(response);

    if (generatedHooks.length === 0) {
      throw new Error("The Brand agent did not return valid hook JSON.");
    }

    mutateBlock(props.tabId, props.block.id, (block, _tab, _node, timestamp) => {
      if (block.type !== "hook-bank") {
        return;
      }

      const existingTexts = new Set(block.hooks.map((hook) => hook.text.trim().toLowerCase()));
      const deduped = generatedHooks.filter((hook) => {
        const key = hook.text.trim().toLowerCase();

        if (existingTexts.has(key)) {
          return false;
        }

        existingTexts.add(key);
        return true;
      });

      block.hooks.unshift(...deduped);
      block.lastGeneratedAt = timestamp;
    });

    toast.add({
      title: "Hooks generated",
      description: "Five new hook candidates were added to the bank.",
      color: "success",
      icon: "i-lucide-sparkles",
    });
  } catch (error) {
    toast.add({
      title: "Generation failed",
      description: getErrorMessage(error, "The Brand agent could not generate hooks."),
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  } finally {
    isGenerating.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Hooks</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.hookCount }}
        </p>
      </div>

      <div class="rounded-2xl bg-warning/5 p-4 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">Avg Score</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.averageScore }}/10
        </p>
      </div>

      <div class="rounded-2xl bg-secondary/5 p-4 border border-secondary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">
          Top Category
        </p>
        <p class="mt-2 text-lg sm:text-xl font-black tracking-tight text-secondary truncate">
          {{ summary.topCategory || "None" }}
        </p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Hook Bank</h2>
        <p class="text-xs text-muted">
          Hooks sorted by score to surface the strongest opening angles.
        </p>
        <p
          v-if="block.lastGeneratedAt"
          class="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/60"
        >
          Last generated {{ formatDateTime(block.lastGeneratedAt) }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          size="sm"
          class="rounded-full"
          @click="addHook"
        >
          Add Hook
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
          size="sm"
          class="rounded-full"
          :loading="isGenerating"
          @click="generateHooks"
        >
          AI Generate
        </UButton>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="sortedHooks.length === 0"
      class="border-dashed border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto"
      >
        <UIcon name="i-lucide-link" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No hooks stored yet</p>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        class="mt-3 rounded-full"
        icon="i-lucide-plus"
        @click="addHook"
      >
        Add first hook
      </UButton>
    </div>

    <!-- Hook List -->
    <div v-else class="space-y-3">
      <article
        v-for="hook in sortedHooks"
        :key="hook.id"
        class="rounded-2xl border border-muted/20 bg-default/40 p-4 transition-all hover:border-muted/30"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-3">
            <!-- Category Input -->
            <div>
              <label
                :for="'category-' + hook.id"
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Category
              </label>
              <UInput
                :id="'category-' + hook.id"
                :model-value="hook.category"
                placeholder="e.g. curiosity"
                variant="subtle"
                size="sm"
                class="w-full sm:w-48 rounded-xl"
                :ui="{ base: 'font-bold' }"
                @update:model-value="
                  mutateHook(hook.id, (entry) => {
                    entry.category = ($event ?? '').slice(0, 40);
                  })
                "
              />
            </div>

            <!-- Accessible Score Rating -->
            <div>
              <label
                :for="'score-' + hook.id"
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Hook Score ({{ hook.score }}/10)
              </label>
              <div class="flex items-center gap-2">
                <USelect
                  :id="'score-' + hook.id"
                  :model-value="hook.score"
                  :items="
                    Array.from({ length: 10 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
                  "
                  variant="subtle"
                  size="sm"
                  class="w-20 rounded-xl"
                  @update:model-value="setHookScore(hook.id, $event as number)"
                />
                <div class="flex items-center gap-1 flex-1">
                  <div
                    v-for="score in 10"
                    :key="`${hook.id}-${score}`"
                    class="h-1.5 flex-1 rounded-full transition-all"
                    :class="score <= hook.score ? 'bg-primary' : 'bg-elevated/20'"
                    :aria-label="`Score ${score}`"
                  />
                </div>
              </div>
            </div>

            <!-- Hook Text -->
            <div>
              <label
                :for="'text-' + hook.id"
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5"
              >
                Hook Text
              </label>
              <UTextarea
                :id="'text-' + hook.id"
                :model-value="hook.text"
                autoresize
                :rows="2"
                variant="subtle"
                placeholder="Write the hook..."
                class="rounded-2xl"
                :ui="{ base: 'bg-elevated/5' }"
                @update:model-value="
                  mutateHook(hook.id, (entry) => {
                    entry.text = ($event ?? '').slice(0, 320);
                  })
                "
              />
            </div>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            class="rounded-lg hover:text-error hover:bg-error/10 shrink-0"
            aria-label="Remove hook"
            @click="removeHook(hook.id)"
          />
        </div>
      </article>
    </div>
  </div>
</template>
