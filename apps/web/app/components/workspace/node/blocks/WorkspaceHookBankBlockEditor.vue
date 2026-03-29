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
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Hooks</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">{{ summary.hookCount }}</p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">Avg Score</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ summary.averageScore }}/10
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
          Top Category
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-secondary">
          {{ summary.topCategory || "None" }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Hook bank</p>
        <p class="text-sm text-muted">
          Hooks are sorted by score so the strongest opening angles stay at the top of the stack.
        </p>
        <p v-if="block.lastGeneratedAt" class="mt-1 text-xs text-muted">
          Last generated {{ formatDateTime(block.lastGeneratedAt) }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addHook"
        >
          Add Hook
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
          class="rounded-full px-4"
          :loading="isGenerating"
          @click="generateHooks"
        >
          AI Generate
        </UButton>
      </div>
    </div>

    <div
      v-if="sortedHooks.length === 0"
      class="rounded-[32px] border border-dashed border-muted/40 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No hooks stored yet.</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="hook in sortedHooks"
        :key="hook.id"
        class="rounded-[30px] border border-muted/30 bg-default/60 p-5 transition-all hover:border-primary/25"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput
                :model-value="hook.category"
                placeholder="pattern-interrupt"
                size="sm"
                class="max-w-48 rounded-full"
                :ui="{ base: 'rounded-full font-semibold' }"
                @update:model-value="
                  mutateHook(hook.id, (entry) => {
                    entry.category = ($event ?? '').slice(0, 40);
                  })
                "
              />

              <div class="flex items-center gap-1.5">
                <button
                  v-for="score in 10"
                  :key="`${hook.id}-${score}`"
                  type="button"
                  class="h-7 w-3 rounded-full transition-all"
                  :class="score <= hook.score ? 'bg-primary' : 'bg-muted/35 hover:bg-muted/55'"
                  @click="setHookScore(hook.id, score)"
                />
              </div>

              <span class="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                {{ hook.score }}/10
              </span>
            </div>

            <UTextarea
              :model-value="hook.text"
              autoresize
              :rows="2"
              placeholder="Write the hook..."
              :ui="{ base: 'rounded-[22px] bg-elevated/30' }"
              @update:model-value="
                mutateHook(hook.id, (entry) => {
                  entry.text = ($event ?? '').slice(0, 320);
                })
              "
            />
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="rounded-xl hover:text-error"
            @click="removeHook(hook.id)"
          />
        </div>
      </article>
    </div>
  </div>
</template>
