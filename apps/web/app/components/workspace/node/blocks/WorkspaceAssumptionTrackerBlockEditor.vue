<script setup lang="ts">
import {
  createWorkspaceStrategicAssumption,
  getAssumptionTrackerSummary,
  resolveStrategicAssumptionLinkLabel,
  workspaceBusinessModelCanvasCellLabels,
  workspaceStrategicAssumptionStatusLabels,
  type WorkspaceAssumptionTrackerBlock,
  type WorkspaceBusinessModelCanvasCellKey,
  type WorkspaceStrategicAssumption,
  type WorkspaceStrategicAssumptionFilter,
  type WorkspaceStrategicAssumptionLinkType,
  type WorkspaceStrategicAssumptionStatus,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceAssumptionTrackerBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getAssumptionTrackerSummary(props.block));

const filterOptions: Array<{
  label: string;
  value: WorkspaceStrategicAssumptionFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Validating", value: "validating" },
  { label: "Confirmed", value: "confirmed" },
  { label: "At Risk", value: "at-risk" },
  { label: "False", value: "false" },
];

const statusOptions: WorkspaceStrategicAssumptionStatus[] = [
  "validating",
  "confirmed",
  "at-risk",
  "false",
];

const baseLinkOptions = computed(() => {
  const options: Array<{ label: string; value: string }> = [{ label: "Unlinked", value: "none" }];

  if (!currentNode.value) {
    return options;
  }

  for (const tab of currentNode.value.tabs) {
    for (const block of tab.blocks) {
      if (block.type === "okr-tracker") {
        for (const objective of block.objectives) {
          options.push({
            label: `OKR: ${objective.title.trim() || "Untitled objective"}`,
            value: `okr:${objective.id}`,
          });
        }
      }

      if (block.type === "decision-matrix") {
        options.push({
          label: `Decision: ${block.question.trim() || block.title.trim() || "Untitled decision"}`,
          value: `decision:${block.id}`,
        });
      }
    }
  }

  for (const key of Object.keys(workspaceBusinessModelCanvasCellLabels) as WorkspaceBusinessModelCanvasCellKey[]) {
    options.push({
      label: `BMC: ${workspaceBusinessModelCanvasCellLabels[key]}`,
      value: `bmc:${key}`,
    });
  }

  return options;
});

const visibleAssumptions = computed(() => {
  if (props.block.filter === "all") {
    return props.block.assumptions;
  }

  return props.block.assumptions.filter((assumption) => assumption.status === props.block.filter);
});

function getFilterCount(filter: WorkspaceStrategicAssumptionFilter) {
  if (filter === "all") {
    return props.block.assumptions.length;
  }

  return props.block.assumptions.filter((assumption) => assumption.status === filter).length;
}

function getStatusClasses(status: WorkspaceStrategicAssumptionStatus) {
  switch (status) {
    case "confirmed":
      return "border-success/40 bg-success/5 text-success";
    case "at-risk":
      return "border-error/40 bg-error/5 text-error";
    case "false":
      return "border-muted/40 bg-muted/10 text-muted";
    default:
      return "border-warning/40 bg-warning/5 text-warning";
  }
}

function clampConfidence(value: string) {
  const numeric = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "3";
}

function getAssumptionLinkValue(assumption: WorkspaceStrategicAssumption) {
  if (assumption.linkType === "none" || !assumption.linkId) {
    return "none";
  }

  return `${assumption.linkType}:${assumption.linkId}`;
}

function getLinkOptions(assumption: WorkspaceStrategicAssumption) {
  const currentValue = getAssumptionLinkValue(assumption);

  if (baseLinkOptions.value.some((option) => option.value === currentValue)) {
    return baseLinkOptions.value;
  }

  return [
    {
      label: currentValue === "none" ? "Unlinked" : "Missing link",
      value: currentValue,
    },
    ...baseLinkOptions.value,
  ];
}

function parseLinkValue(value: string): {
  linkType: WorkspaceStrategicAssumptionLinkType;
  linkId: string | null;
} {
  if (!value || value === "none") {
    return {
      linkType: "none",
      linkId: null,
    };
  }

  const [rawLinkType, rawLinkId] = value.split(":");

  if (
    (rawLinkType === "okr" || rawLinkType === "decision" || rawLinkType === "bmc") &&
    rawLinkId
  ) {
    return {
      linkType: rawLinkType,
      linkId: rawLinkId,
    };
  }

  return {
    linkType: "none",
    linkId: null,
  };
}

function addAssumption() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "assumption-tracker") {
      return;
    }

    block.assumptions.unshift(createWorkspaceStrategicAssumption());
  });
}

function removeAssumption(assumptionId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "assumption-tracker") {
      return;
    }

    block.assumptions = block.assumptions.filter((assumption) => assumption.id !== assumptionId);
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Tracked</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">{{ summary.total }}</p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">At Risk</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.atRiskCount }}</p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">Confidence</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ summary.averageConfidence }}/5
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Strategic assumptions</p>
        <p class="text-sm text-muted">
          Track the bets behind the strategy and surface the ones most likely to break execution.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addAssumption"
      >
        New Assumption
      </UButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="filter in filterOptions"
        :key="filter.value"
        :color="block.filter === filter.value ? 'primary' : 'neutral'"
        :variant="block.filter === filter.value ? 'soft' : 'ghost'"
        class="rounded-full px-4"
        @click="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'assumption-tracker') return;
            entry.filter = filter.value;
          })
        "
      >
        {{ filter.label }} · {{ getFilterCount(filter.value) }}
      </UButton>
    </div>

    <div v-if="visibleAssumptions.length === 0" class="rounded-[32px] border border-dashed border-muted/50 bg-elevated/10 py-14 text-center">
      <p class="text-sm font-semibold text-muted">No assumptions in this filter.</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="assumption in visibleAssumptions"
        :key="assumption.id"
        class="rounded-[32px] border p-5"
        :class="getStatusClasses(assumption.status)"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="assumption.statement"
              variant="none"
              placeholder="Assumption statement"
              class="w-full"
              :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                  if (!target) return;
                  target.statement = ($event ?? '').slice(0, 240);
                })
              "
            />

            <p class="mt-2 text-sm text-muted">
              {{ currentNode ? resolveStrategicAssumptionLinkLabel(currentNode, assumption) || "No linked strategic area." : "No linked strategic area." }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UBadge variant="soft" size="sm" class="rounded-full">
              {{ workspaceStrategicAssumptionStatusLabels[assumption.status] }}
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-xl hover:text-error"
              @click="removeAssumption(assumption.id)"
            />
          </div>
        </div>

        <div class="mt-5 grid gap-4 xl:grid-cols-3">
          <UFormField label="Link" size="sm">
            <USelect
              :model-value="getAssumptionLinkValue(assumption)"
              :items="getLinkOptions(assumption)"
              class="rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                  if (!target) return;
                  const nextLink = parseLinkValue($event ?? 'none');
                  target.linkType = nextLink.linkType;
                  target.linkId = nextLink.linkId;
                })
              "
            />
          </UFormField>

          <UFormField label="Owner" size="sm">
            <UInput
              :model-value="assumption.owner"
              placeholder="Owner"
              class="rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                  if (!target) return;
                  target.owner = ($event ?? '').slice(0, 120);
                })
              "
            />
          </UFormField>

          <UFormField label="Review Date" size="sm">
            <UInput
              :model-value="assumption.reviewDate ?? ''"
              type="date"
              class="rounded-2xl"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                  if (!target) return;
                  target.reviewDate = $event || null;
                })
              "
            />
          </UFormField>
        </div>

        <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div class="space-y-4 rounded-[24px] border border-muted/30 bg-default/50 p-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                <span>Confidence</span>
                <span>{{ assumption.confidence }}/5</span>
              </div>
              <input
                :value="assumption.confidence"
                type="range"
                min="1"
                max="5"
                class="h-2 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                @input="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'assumption-tracker') return;
                    const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                    if (!target) return;
                    target.confidence = clampConfidence(getInputValue($event));
                  })
                "
              />
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Status</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="status in statusOptions"
                  :key="status"
                  :color="assumption.status === status ? 'primary' : 'neutral'"
                  :variant="assumption.status === status ? 'soft' : 'ghost'"
                  class="rounded-full"
                  @click="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'assumption-tracker') return;
                      const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                      if (!target) return;
                      target.status = status;
                    })
                  "
                >
                  {{ workspaceStrategicAssumptionStatusLabels[status] }}
                </UButton>
              </div>
            </div>
          </div>

          <UFormField label="Evidence Notes" size="sm">
            <UTextarea
              :model-value="assumption.evidenceNotes"
              :rows="6"
              autoresize
              placeholder="What customer input, market signal, or operational evidence supports this?"
              class="w-full"
              :ui="{ base: 'rounded-[24px] bg-default/50' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'assumption-tracker') return;
                  const target = entry.assumptions.find((candidate) => candidate.id === assumption.id);
                  if (!target) return;
                  target.evidenceNotes = ($event ?? '').slice(0, 4000);
                })
              "
            />
          </UFormField>
        </div>
      </article>
    </div>
  </div>
</template>
