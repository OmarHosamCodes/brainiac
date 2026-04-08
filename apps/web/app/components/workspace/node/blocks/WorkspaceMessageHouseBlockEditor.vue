<script setup lang="ts">
import {
  buildMessageHouseStressTestPrompt,
  getMessageHouseSummary,
  type WorkspaceMessageHouseBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceMessageHouseBlock;
  tabId: string;
}>();

const toast = useToast();
const { mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();

const summary = computed(() => getMessageHouseSummary(props.block));
const isStressTesting = ref(false);

async function runStressTest() {
  isStressTesting.value = true;

  try {
    const response = await runBlockAgentPrompt(
      props.tabId,
      props.block.id,
      buildMessageHouseStressTestPrompt(props.block),
    );

    mutateBlock(props.tabId, props.block.id, (block, _tab, _node, timestamp) => {
      if (block.type !== "message-house") {
        return;
      }

      block.latestStressTest = response;
      block.stressTestUpdatedAt = timestamp;
    });

    toast.add({
      title: "Stress test saved",
      description: "The Brand agent analysis was added to the message house.",
      color: "success",
      icon: "i-lucide-sparkles",
    });
  } catch (error) {
    toast.add({
      title: "Stress test failed",
      description: getErrorMessage(
        error,
        "The Brand agent could not stress-test the message house.",
      ),
      color: "error",
      icon: "i-lucide-alert-circle",
    });
  } finally {
    isStressTesting.value = false;
  }
}

const bottomSections = [
  {
    key: "audiencePains",
    label: "Audience Pains",
    placeholder: "What frustrations, risks, and stalled outcomes does the audience already feel?",
  },
  {
    key: "proofPoints",
    label: "Proof Points",
    placeholder:
      "Case studies, client results, founder receipts, or market proof that support the promise.",
  },
  {
    key: "voicePrinciples",
    label: "Voice Principles",
    placeholder: "Rules for how the brand should sound across posts, scripts, and team output.",
  },
] as const;
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Filled</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.filledSectionCount }}/7
        </p>
      </div>

      <div class="rounded-2xl bg-secondary/5 p-4 border border-secondary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Pillars</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-secondary">
          {{ summary.pillarCount }}
        </p>
      </div>

      <div class="rounded-2xl bg-warning/5 p-4 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">Stress Test</p>
        <p class="mt-2 text-lg sm:text-xl font-black tracking-tight text-warning">
          {{ summary.latestStressTestAvailable ? "Saved" : "Pending" }}
        </p>
      </div>
    </div>

    <!-- Brand Promise Section -->
    <section class="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 class="text-sm font-black text-highlighted tracking-tight">Brand Promise</h2>
          <p class="text-xs text-muted mt-0.5">
            The line the whole team can repeat without improvising.
          </p>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
          size="sm"
          class="rounded-full"
          :loading="isStressTesting"
          @click="runStressTest"
        >
          AI Stress-Test
        </UButton>
      </div>

      <UTextarea
        :model-value="block.brandPromise"
        autoresize
        variant="subtle"
        :rows="3"
        class="rounded-2xl"
        :ui="{ base: 'bg-default/60 text-lg font-black tracking-tight leading-relaxed placeholder:text-muted/30' }"
        placeholder="What is the single promise this brand owns?"
        @update:model-value="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'message-house') return;
            entry.brandPromise = ($event ?? '').slice(0, 4000);
          })
        "
      />
    </section>

    <!-- Pillars Grid -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="pillar in block.pillars"
        :key="pillar.id"
        class="rounded-2xl border border-muted/20 bg-default/40 p-4 transition-colors hover:border-muted/30"
      >
        <div class="mb-3">
          <label :for="'pillar-title-' + pillar.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
            Pillar
          </label>
          <UInput
            :id="'pillar-title-' + pillar.id"
            :model-value="pillar.title"
            variant="none"
            placeholder="Pillar title"
            size="lg"
            class="w-full"
            :ui="{ base: 'px-0 text-base font-black text-highlighted placeholder:text-muted/40 uppercase tracking-tight' }"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'message-house') return;
                const target = entry.pillars.find((candidate) => candidate.id === pillar.id);
                if (!target) return;
                target.title = ($event ?? '').slice(0, 80);
              })
            "
          />
        </div>

        <label :for="'pillar-body-' + pillar.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
          Message
        </label>
        <UTextarea
          :id="'pillar-body-' + pillar.id"
          :model-value="pillar.body"
          autoresize
          variant="subtle"
          :rows="5"
          class="rounded-xl"
          :ui="{ base: 'bg-elevated/5 leading-relaxed text-sm' }"
          placeholder="What repeatable message should this pillar carry?"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'message-house') return;
              const target = entry.pillars.find((candidate) => candidate.id === pillar.id);
              if (!target) return;
              target.body = ($event ?? '').slice(0, 2000);
            })
          "
        />
      </article>
    </div>

    <!-- Supporting Sections Grid -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="section in bottomSections"
        :key="section.key"
        class="rounded-2xl border border-muted/20 bg-default/40 p-4 transition-colors hover:border-muted/30"
      >
        <label :for="section.key" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-1.5">
          {{ section.label }}
        </label>
        <UTextarea
          :id="section.key"
          :model-value="block[section.key]"
          autoresize
          variant="subtle"
          :rows="5"
          class="rounded-xl"
          :ui="{ base: 'bg-elevated/5 leading-relaxed text-sm' }"
          :placeholder="section.placeholder"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'message-house') return;
              entry[section.key] = ($event ?? '').slice(0, 4000);
            })
          "
        />
      </article>
    </div>

    <!-- Stress Test Output -->
    <section class="rounded-2xl border border-warning/20 bg-warning/5 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 class="text-sm font-black text-highlighted tracking-tight">Stress-Test Output</h2>
          <p class="text-xs text-muted mt-0.5">
            Finds gaps, contradictions, and weak proof.
          </p>
        </div>

        <p v-if="block.stressTestUpdatedAt" class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
          Last run {{ formatDateTime(block.stressTestUpdatedAt) }}
        </p>
      </div>

      <div
        class="rounded-xl border border-muted/20 bg-default/60 p-4 text-sm leading-relaxed text-toned min-h-[80px]"
      >
        <p v-if="block.latestStressTest" class="whitespace-pre-wrap">{{ block.latestStressTest }}</p>
        <p v-else class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">Run AI Stress-Test to get a critique of the messaging</p>
      </div>
    </section>
  </div>
</template>
