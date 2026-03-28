<script setup lang="ts">
import {
  WORKSPACE_CONTENT_PLATFORMS,
  WORKSPACE_CONTENT_ROI_SORT_OPTIONS,
  createWorkspaceContentRoiItem,
  getContentRoiScore,
  getContentRoiStatus,
  getContentRoiTrackerSummary,
  sortContentRoiItems,
  workspaceContentPlatformLabels,
  workspaceContentRoiSortLabels,
  workspaceContentRoiStatusLabels,
  type WorkspaceContentPlatform,
  type WorkspaceContentRoiSort,
  type WorkspaceContentRoiTrackerBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceContentRoiTrackerBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getContentRoiTrackerSummary(props.block));
const sortedItems = computed(() => sortContentRoiItems(props.block.items, props.block.sortBy));
const platformOptions = WORKSPACE_CONTENT_PLATFORMS.map((platform) => ({
  label: workspaceContentPlatformLabels[platform],
  value: platform,
})) satisfies Array<{ label: string; value: WorkspaceContentPlatform }>;
const rowGridStyle = {
  gridTemplateColumns:
    "minmax(16rem,1.6fr) minmax(8rem,0.8fr) minmax(10rem,1fr) minmax(10rem,1fr) minmax(7rem,0.7fr) minmax(6rem,0.6fr) minmax(12rem,1fr) minmax(12rem,1fr) minmax(18rem,1.4fr)",
};

function addItem() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-roi-tracker") {
      return;
    }

    block.items.unshift(
      createWorkspaceContentRoiItem({
        title: "",
      }),
    );
  });
}

function mutateItem(
  itemId: string,
  mutator: (item: WorkspaceContentRoiTrackerBlock["items"][number]) => void,
) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-roi-tracker") {
      return;
    }

    const target = block.items.find((candidate) => candidate.id === itemId);

    if (!target) {
      return;
    }

    mutator(target);
  });
}

function removeItem(itemId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-roi-tracker") {
      return;
    }

    block.items = block.items.filter((item) => item.id !== itemId);
  });
}

function setSortBy(sortBy: WorkspaceContentRoiSort) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "content-roi-tracker") {
      return;
    }

    block.sortBy = sortBy;
  });
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "0";
}

function clampInteger(value: string, min: number, max: number) {
  const numeric = Number(value || 0);

  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function getStatusClasses(score: number) {
  const status = getContentRoiStatus(score);

  switch (status) {
    case "high-return":
      return "border-success/35 bg-success/5 text-success";
    case "promising":
      return "border-warning/35 bg-warning/5 text-warning";
    default:
      return "border-error/35 bg-error/5 text-error";
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
          Top Platform
        </p>
        <p class="mt-2 text-3xl font-black tracking-tight text-primary">
          {{
            summary.topPlatform ? workspaceContentPlatformLabels[summary.topPlatform] : "None"
          }}
        </p>
        <p class="mt-1 text-sm text-muted">Highest average ROI across current rows</p>
      </div>

      <div class="rounded-[28px] bg-secondary/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary/80">
          Top Campaign
        </p>
        <p class="mt-2 text-2xl font-black tracking-tight text-secondary">
          {{ summary.topCampaign || "No campaign" }}
        </p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">
          Influenced Leads
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.totalInfluencedLeads }}
        </p>
        <p class="mt-1 text-sm text-muted">Lead count weighted by conversion influence</p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">
          Average ROI
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ summary.averageScore }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ summary.highReturnCount }} high-return pieces right now
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Commercial impact tracker</p>
        <p class="text-sm text-muted">
          Track which pieces actually create leads, influence conversions, and keep paying back through repurposing.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sortBy in WORKSPACE_CONTENT_ROI_SORT_OPTIONS"
            :key="sortBy"
            color="neutral"
            :variant="block.sortBy === sortBy ? 'solid' : 'soft'"
            class="rounded-full px-4"
            @click="setSortBy(sortBy)"
          >
            Sort: {{ workspaceContentRoiSortLabels[sortBy] }}
          </UButton>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addItem"
        >
          Add Content Piece
        </UButton>
      </div>
    </div>

    <div
      v-if="sortedItems.length === 0"
      class="rounded-[32px] border border-dashed border-muted/45 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No content ROI rows yet.</p>
    </div>

    <div v-else class="overflow-x-auto pb-2">
      <div
        class="grid min-w-[1520px] gap-px overflow-hidden rounded-[28px] border border-muted/30 bg-muted/30"
        :style="rowGridStyle"
      >
        <div
          v-for="label in ['Content', 'Platform', 'Campaign', 'Goal', 'Reach', 'Leads', 'Conversion Influence', 'Repurpose Value', 'ROI Status']"
          :key="label"
          class="bg-elevated/80 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted"
        >
          {{ label }}
        </div>

        <template v-for="item in sortedItems" :key="item.id">
          <div class="bg-default/80 p-3">
            <UInput
              :model-value="item.title"
              variant="none"
              placeholder="Content piece"
              class="w-full"
              :ui="{ base: 'px-0 text-sm font-bold text-highlighted placeholder:text-muted/60' }"
              @update:model-value="
                mutateItem(item.id, (entry) => {
                  entry.title = ($event ?? '').slice(0, 240);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <USelect
              :model-value="item.platform"
              :items="platformOptions"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateItem(item.id, (entry) => {
                  entry.platform = ($event as WorkspaceContentPlatform | undefined) ?? 'linkedin';
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <UInput
              :model-value="item.campaign"
              placeholder="Campaign"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateItem(item.id, (entry) => {
                  entry.campaign = ($event ?? '').slice(0, 120);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <UInput
              :model-value="item.goal"
              placeholder="Goal"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateItem(item.id, (entry) => {
                  entry.goal = ($event ?? '').slice(0, 160);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <UInput
              :model-value="String(item.reach)"
              type="number"
              min="0"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateItem(item.id, (entry) => {
                  entry.reach = clampInteger(String($event ?? 0), 0, 10000000);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <UInput
              :model-value="String(item.leads)"
              type="number"
              min="0"
              size="sm"
              class="rounded-xl"
              @update:model-value="
                mutateItem(item.id, (entry) => {
                  entry.leads = clampInteger(String($event ?? 0), 0, 100000);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-muted">Score</span>
              <span class="text-sm font-black text-primary">{{ item.conversionInfluence }}</span>
            </div>
            <input
              :value="item.conversionInfluence"
              type="range"
              min="1"
              max="10"
              class="mt-3 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
              @input="
                mutateItem(item.id, (entry) => {
                  entry.conversionInfluence = clampInteger(getInputValue($event), 1, 10);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-muted">Score</span>
              <span class="text-sm font-black text-primary">{{ item.repurposeValue }}</span>
            </div>
            <input
              :value="item.repurposeValue"
              type="range"
              min="1"
              max="10"
              class="mt-3 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
              @input="
                mutateItem(item.id, (entry) => {
                  entry.repurposeValue = clampInteger(getInputValue($event), 1, 10);
                })
              "
            />
          </div>

          <div class="bg-default/80 p-3">
            <div
              class="min-w-0 rounded-[20px] border p-3"
              :class="getStatusClasses(getContentRoiScore(item))"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-bold uppercase tracking-[0.18em]">
                    {{ workspaceContentRoiStatusLabels[getContentRoiStatus(getContentRoiScore(item))] }}
                  </p>
                  <p class="mt-1 text-2xl font-black tracking-tight">
                    {{ getContentRoiScore(item) }}
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-muted">
                    {{ item.leads }} leads, sorted by {{ workspaceContentRoiSortLabels[block.sortBy] }}
                  </p>
                </div>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="xs"
                  class="rounded-lg hover:bg-error/10 hover:text-error"
                  @click="removeItem(item.id)"
                />
              </div>

              <UProgress
                :model-value="getContentRoiScore(item)"
                color="primary"
                size="sm"
                class="mt-3 rounded-full"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
