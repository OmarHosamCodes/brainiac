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
    <!-- Summary Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-3xl bg-primary/5 p-5 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Filled</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ summary.filledSectionCount }}/7
        </p>
      </div>

      <div class="rounded-3xl bg-secondary/5 p-5 border border-secondary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Pillars</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-secondary">
          {{ summary.pillarCount }}
        </p>
      </div>

      <div class="rounded-3xl bg-warning/5 p-5 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">Stress Test</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.latestStressTestAvailable ? "Saved" : "Pending" }}
        </p>
      </div>
    </div>

    <!-- Brand Promise Section -->
    <section
      class="rounded-3xl border border-primary/20 bg-primary/5 p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">Brand Promise</h3>
          <p class="text-xs text-muted mt-1">
            The promise should read like the line the whole team can repeat without improvising.
          </p>
        </div>

        <UButton
          color="primary"
          variant="subtle"
          icon="i-lucide-sparkles"
          class="rounded-full px-4"
          size="sm"
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
        :rows="4"
        class="mt-6 rounded-2xl"
        :ui="{ base: 'bg-default/60 text-lg font-bold tracking-tight leading-relaxed placeholder:text-muted/30' }"
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
    <div class="grid gap-4 xl:grid-cols-3">
      <article
        v-for="pillar in block.pillars"
        :key="pillar.id"
        class="rounded-3xl border border-muted/20 bg-default/40 p-5 group transition-all hover:border-primary/20"
      >
        <div class="space-y-1 px-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Messaging Pillar</label>
          <UInput
            :model-value="pillar.title"
            variant="none"
            placeholder="Pillar title"
            class="w-full"
            :ui="{ base: 'px-0 text-base font-bold text-highlighted placeholder:text-muted/30 uppercase tracking-tight' }"
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

        <UTextarea
          :model-value="pillar.body"
          autoresize
          variant="subtle"
          :rows="6"
          class="mt-4 rounded-2xl"
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

    <!-- Additional Sections Grid -->
    <div class="grid gap-4 xl:grid-cols-3">
      <article
        v-for="section in bottomSections"
        :key="section.key"
        class="rounded-3xl border border-muted/20 bg-default/40 p-5 transition-all hover:border-muted/30"
      >
        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 px-1">{{ section.label }}</label>
        <UTextarea
          :model-value="block[section.key]"
          autoresize
          variant="subtle"
          :rows="7"
          class="mt-4 rounded-2xl"
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
    <section class="rounded-3xl border border-warning/20 bg-warning/5 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-highlighted uppercase tracking-wider">Stress-test output</h3>
          <p class="text-xs text-muted mt-1">
            Finds gaps, contradictions, and weak proof before the brand message is repeated.
          </p>
        </div>

        <p v-if="block.stressTestUpdatedAt" class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
          Last run {{ formatDateTime(block.stressTestUpdatedAt) }}
        </p>
      </div>

      <div
        class="mt-6 rounded-2xl border border-muted/20 bg-default/60 p-5 text-sm leading-relaxed text-toned shadow-sm min-h-[100px] flex items-center justify-center text-center"
      >
        <p v-if="block.latestStressTest" class="whitespace-pre-wrap text-left w-full">{{ block.latestStressTest }}</p>
        <p v-else class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">Run AI Stress-Test to get a critique of the messaging</p>
      </div>
    </section>
  </div>
</template>
