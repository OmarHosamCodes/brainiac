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
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Filled</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">
          {{ summary.filledSectionCount }}/7
        </p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">Pillars</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-secondary">
          {{ summary.pillarCount }}
        </p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">Stress Test</p>
        <p class="mt-2 text-2xl font-black tracking-tight text-warning">
          {{ summary.latestStressTestAvailable ? "Saved" : "Pending" }}
        </p>
      </div>
    </div>

    <section
      class="rounded-[34px] border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-default p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
            Brand Promise
          </p>
          <p class="mt-2 text-sm text-muted">
            The promise should read like the line the whole team can repeat without improvising.
          </p>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
          class="rounded-full px-4"
          :loading="isStressTesting"
          @click="runStressTest"
        >
          AI Stress-Test
        </UButton>
      </div>

      <UTextarea
        :model-value="block.brandPromise"
        autoresize
        :rows="4"
        class="mt-5"
        :ui="{ base: 'rounded-[26px] bg-default/85 text-lg font-semibold leading-7' }"
        placeholder="What is the single promise this brand should own in the market?"
        @update:model-value="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'message-house') return;
            entry.brandPromise = ($event ?? '').slice(0, 4000);
          })
        "
      />
    </section>

    <div class="grid gap-4 xl:grid-cols-3">
      <article
        v-for="pillar in block.pillars"
        :key="pillar.id"
        class="rounded-[30px] border border-muted/30 bg-default/60 p-5"
      >
        <UInput
          :model-value="pillar.title"
          variant="none"
          placeholder="Messaging pillar"
          :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'message-house') return;
              const target = entry.pillars.find((candidate) => candidate.id === pillar.id);
              if (!target) return;
              target.title = ($event ?? '').slice(0, 80);
            })
          "
        />

        <UTextarea
          :model-value="pillar.body"
          autoresize
          :rows="6"
          class="mt-4"
          :ui="{ base: 'rounded-[22px] bg-elevated/25' }"
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

    <div class="grid gap-4 xl:grid-cols-3">
      <article
        v-for="section in bottomSections"
        :key="section.key"
        class="rounded-[30px] border border-muted/30 bg-default/60 p-5"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
          {{ section.label }}
        </p>
        <UTextarea
          :model-value="block[section.key]"
          autoresize
          :rows="7"
          class="mt-4"
          :ui="{ base: 'rounded-[22px] bg-elevated/25' }"
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

    <section class="rounded-[32px] border border-warning/25 bg-warning/5 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Stress-test output</p>
          <p class="text-sm text-muted">
            Finds gaps, contradictions, and weak proof before the brand message gets repeated at
            scale.
          </p>
        </div>

        <p v-if="block.stressTestUpdatedAt" class="text-xs font-medium text-muted">
          Last run {{ formatDateTime(block.stressTestUpdatedAt) }}
        </p>
      </div>

      <div
        class="mt-4 rounded-[24px] border border-muted/30 bg-default/75 p-4 text-sm leading-7 text-toned whitespace-pre-wrap"
      >
        {{
          block.latestStressTest ||
          "Run AI Stress-Test to get a critique of the current promise, pillars, proof, and voice rules."
        }}
      </div>
    </section>
  </div>
</template>
