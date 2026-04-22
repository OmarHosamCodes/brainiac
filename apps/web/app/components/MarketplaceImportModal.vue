<script setup lang="ts">
import {
  WORKSPACE_NODE_LIMIT,
  createDefaultWorkspaceTab,
  createWorkspaceNode,
  normalizeWorkspaceNode,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
  type WorkspaceNodeTab,
} from "@brainiac/workspace";
import {
  cloneMarketplaceBlockPayload,
  cloneMarketplaceNodePayloadAsNode,
  cloneMarketplaceTabPayload,
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "~/utils/workspace-marketplace";

const props = defineProps<{
  open: boolean;
  item: WorkspaceMarketplaceItem | null;
  nodes: WorkspaceNode[];
  selectedNodeIds: string[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  imported: [payload: { kind: "node" | "tab" | "block"; nodeId?: string }];
}>();

const workspaceStore = useWorkspaceStore();
const toast = useToast();

const selectedNodeId = ref("");
const selectedTabId = ref("");
const creatingNode = ref(false);
const creatingTab = ref(false);
const newNodeTitle = ref("");
const newTabTitle = ref("");

const kind = computed(() => props.item?.payload.kind ?? null);

const modalTitle = computed(() => {
  if (!kind.value) return "";
  if (kind.value === "node") return "Add node to dashboard";
  if (kind.value === "tab") return "Choose a destination node";
  return "Choose a destination";
});

const modalDescription = computed(() => {
  if (!props.item) return undefined;
  return `Import "${props.item.title}" into your workspace.`;
});

const nodeOptions = computed(() =>
  props.nodes.map((node) => ({
    label: node.title.trim() || "Untitled node",
    value: node.id,
  })),
);

const selectedNode = computed(
  () => props.nodes.find((node) => node.id === selectedNodeId.value) ?? null,
);

const tabOptions = computed(() =>
  (selectedNode.value?.tabs ?? []).map((tab) => ({
    label: tab.title.trim() || "Untitled tab",
    value: tab.id,
  })),
);

const payloadSummary = computed(() => {
  if (!props.item) return "";
  return getMarketplacePayloadSummary(props.item.payload);
});

const payloadLabel = computed(() => {
  if (!props.item) return "";
  return getMarketplacePayloadTypeLabel(props.item.payload);
});

const kindIcon = computed(() => {
  switch (kind.value) {
    case "node":
      return "i-lucide-box";
    case "tab":
      return "i-lucide-layout";
    case "block":
      return "i-lucide-component";
    default:
      return "i-lucide-help-circle";
  }
});

const canSubmit = computed(() => {
  if (!props.item) return false;
  if (kind.value === "node") return true;
  if (kind.value === "tab") return Boolean(selectedNodeId.value);
  return Boolean(selectedNodeId.value && selectedTabId.value);
});

function reset() {
  selectedNodeId.value = "";
  selectedTabId.value = "";
  creatingNode.value = false;
  creatingTab.value = false;
  newNodeTitle.value = "";
  newTabTitle.value = "";
}

function close() {
  emit("update:open", false);
  reset();
}

function initDefaults() {
  if (!props.item) return;

  if (kind.value === "node") return;

  const preferredNodeId =
    props.selectedNodeIds.find((id) => props.nodes.some((n) => n.id === id)) ??
    props.nodes[0]?.id ??
    "";

  selectedNodeId.value = preferredNodeId;
  syncTab();
}

function syncTab() {
  if (kind.value !== "block") {
    selectedTabId.value = "";
    return;
  }

  const tabs = selectedNode.value?.tabs ?? [];
  if (tabs.some((t) => t.id === selectedTabId.value)) return;
  selectedTabId.value = tabs[0]?.id ?? "";
}

function createNewNode() {
  const title = newNodeTitle.value.trim() || "New node";

  if (props.nodes.length >= WORKSPACE_NODE_LIMIT) {
    toast.add({
      title: "Node limit reached",
      description: `A workspace can store up to ${WORKSPACE_NODE_LIMIT} nodes.`,
      color: "warning",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  const anchorNode = props.nodes[props.nodes.length - 1];
  const node = createWorkspaceNode({
    title,
    x: (anchorNode?.x ?? 0) + 56,
    y: (anchorNode?.y ?? 0) + 56,
  });

  workspaceStore.updateNodes((draftNodes) => {
    draftNodes.push(node);
  });

  selectedNodeId.value = node.id;
  creatingNode.value = false;
  newNodeTitle.value = "";
  syncTab();

  toast.add({
    title: "Node created",
    description: `"${title}" was added to your workspace.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

function createNewTab() {
  const title = newTabTitle.value.trim() || "New tab";

  if (!selectedNodeId.value) return;

  const tab = createDefaultWorkspaceTab(title);
  let created = false;

  workspaceStore.updateNodes((draftNodes) => {
    const nodeIndex = draftNodes.findIndex((n) => n.id === selectedNodeId.value);
    if (nodeIndex < 0) return;

    const node = draftNodes[nodeIndex]!;
    node.tabs.push(tab);
    node.viewState.activeTabId = tab.id;
    node.updatedAt = new Date().toISOString();
    draftNodes[nodeIndex] = normalizeWorkspaceNode(node);
    created = true;
  });

  if (created) {
    selectedTabId.value = tab.id;
    creatingTab.value = false;
    newTabTitle.value = "";

    toast.add({
      title: "Tab created",
      description: `"${title}" was added to the node.`,
      color: "success",
      icon: "i-lucide-check",
    });
  }
}

function submit() {
  if (!props.item || !canSubmit.value) return;

  if (kind.value === "node") {
    insertNode();
  } else if (kind.value === "tab") {
    insertTab();
  } else if (kind.value === "block") {
    insertBlock();
  }
}

function insertNode() {
  if (!props.item) return;

  if (props.nodes.length >= WORKSPACE_NODE_LIMIT) {
    toast.add({
      title: "Node limit reached",
      description: `A workspace can store up to ${WORKSPACE_NODE_LIMIT} nodes.`,
      color: "warning",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  const nextNode = cloneMarketplaceNodePayloadAsNode(props.item.payload);
  const anchorNode = props.nodes[props.nodes.length - 1];
  nextNode.x = (anchorNode?.x ?? 0) + 56;
  nextNode.y = (anchorNode?.y ?? 0) + 56;

  workspaceStore.updateNodes((draftNodes) => {
    draftNodes.push(nextNode);
  });

  toast.add({
    title: "Node inserted",
    description: `${props.item.title} was added to your dashboard.`,
    color: "success",
    icon: "i-lucide-check",
  });

  emit("imported", { kind: "node", nodeId: nextNode.id });
  close();
}

function insertTab() {
  if (!props.item) return;

  const imported = cloneMarketplaceTabPayload(props.item.payload);
  if (!imported) return;

  let inserted = false;
  let targetNodeTitle = "";

  workspaceStore.updateNodes((draftNodes) => {
    const nodeIndex = draftNodes.findIndex((n) => n.id === selectedNodeId.value);
    if (nodeIndex < 0) return;

    const timestamp = new Date().toISOString();
    const targetNode = draftNodes[nodeIndex]!;
    targetNode.tabs.push(imported.tab);
    targetNode.customBlockTemplates.push(...imported.templates);
    targetNodeTitle = targetNode.title.trim() || "Untitled node";
    targetNode.viewState.activeTabId = imported.tab.id;
    targetNode.updatedAt = timestamp;
    draftNodes[nodeIndex] = normalizeWorkspaceNode(targetNode);
    inserted = true;
  });

  if (!inserted) return;

  toast.add({
    title: "Tab inserted",
    description: `${props.item.title} was added to ${targetNodeTitle}.`,
    color: "success",
    icon: "i-lucide-check",
  });

  emit("imported", { kind: "tab", nodeId: selectedNodeId.value });
  close();
}

function insertBlock() {
  if (!props.item) return;

  const imported = cloneMarketplaceBlockPayload(props.item.payload);
  if (!imported) return;

  let inserted = false;
  let targetTabTitle = "";

  workspaceStore.updateNodes((draftNodes) => {
    const nodeIndex = draftNodes.findIndex((n) => n.id === selectedNodeId.value);
    if (nodeIndex < 0) return;

    const timestamp = new Date().toISOString();
    const targetNode = draftNodes[nodeIndex]!;
    const targetTab = targetNode.tabs.find((t) => t.id === selectedTabId.value);
    if (!targetTab) return;

    targetNode.customBlockTemplates.push(...imported.templates);
    targetTab.blocks.push(imported.block);
    targetTab.updatedAt = timestamp;
    targetTabTitle = targetTab.title.trim() || "Untitled tab";
    targetNode.viewState.activeTabId = targetTab.id;
    targetNode.updatedAt = timestamp;
    draftNodes[nodeIndex] = normalizeWorkspaceNode(targetNode);
    inserted = true;
  });

  if (!inserted) return;

  toast.add({
    title: "Block inserted",
    description: `${props.item.title} was added to ${targetTabTitle}.`,
    color: "success",
    icon: "i-lucide-check",
  });

  emit("imported", { kind: "block", nodeId: selectedNodeId.value });
  close();
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) initDefaults();
  },
);

watch(
  () => selectedNodeId.value,
  () => {
    creatingTab.value = false;
    newTabTitle.value = "";
    syncTab();
  },
);
</script>

<template>
  <UModal
    :open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{
      content: 'sm:max-w-lg rounded-[28px] overflow-hidden',
      body: 'space-y-5 p-6',
      footer: 'flex items-center justify-end gap-3 border-t border-muted/20 bg-elevated/20 p-5',
    }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <!-- Item preview -->
      <div class="rounded-2xl border border-muted/30 bg-elevated/20 p-4">
        <div class="flex items-center gap-2.5">
          <div
            class="shrink-0 rounded-xl p-2"
            :class="[
              kind === 'node' && 'bg-primary/10 text-primary',
              kind === 'tab' && 'bg-success/10 text-success',
              kind === 'block' && 'bg-warning/10 text-warning',
            ]"
          >
            <UIcon :name="kindIcon" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Importing {{ payloadLabel }}
            </p>
            <p class="mt-0.5 font-semibold text-highlighted truncate">
              {{ item?.title }}
            </p>
          </div>
          <UBadge
            :color="kind === 'node' ? 'primary' : kind === 'tab' ? 'success' : 'warning'"
            variant="subtle"
            size="sm"
            class="shrink-0"
          >
            {{ payloadSummary }}
          </UBadge>
        </div>
        <p v-if="item?.summary" class="mt-2 text-sm text-muted">
          {{ item.summary }}
        </p>
      </div>

      <!-- Node confirmation for node kind -->
      <div v-if="kind === 'node'" class="rounded-2xl border border-dashed border-muted/30 p-4">
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-info" class="size-4 shrink-0" />
          <p>This node will be added to your dashboard canvas, positioned near your last node.</p>
        </div>
      </div>

      <!-- Node selection for tab/block kind -->
      <template v-if="kind === 'tab' || kind === 'block'">
        <UFormField label="Destination node">
          <div class="flex items-center gap-2">
            <USelect
              v-if="!creatingNode"
              v-model="selectedNodeId"
              :items="nodeOptions"
              placeholder="Select a node..."
              class="flex-1"
            />
            <div v-else class="flex flex-1 items-center gap-2">
              <UInput
                v-model="newNodeTitle"
                placeholder="Node title..."
                class="flex-1"
                autofocus
                @keydown.enter="createNewNode"
                @keydown.escape="creatingNode = false"
              />
              <UButton
                icon="i-lucide-check"
                color="primary"
                size="sm"
                :disabled="!newNodeTitle.trim()"
                @click="createNewNode"
              />
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="creatingNode = false"
              />
            </div>
            <UButton
              v-if="!creatingNode"
              icon="i-lucide-plus"
              color="neutral"
              variant="subtle"
              size="sm"
              @click="creatingNode = true"
            >
              New node
            </UButton>
          </div>
        </UFormField>
      </template>

      <!-- Tab selection for block kind -->
      <template v-if="kind === 'block' && selectedNodeId">
        <UFormField label="Destination tab">
          <div class="flex items-center gap-2">
            <USelect
              v-if="!creatingTab"
              v-model="selectedTabId"
              :items="tabOptions"
              placeholder="Select a tab..."
              class="flex-1"
            />
            <div v-else class="flex flex-1 items-center gap-2">
              <UInput
                v-model="newTabTitle"
                placeholder="Tab title..."
                class="flex-1"
                autofocus
                @keydown.enter="createNewTab"
                @keydown.escape="creatingTab = false"
              />
              <UButton
                icon="i-lucide-check"
                color="primary"
                size="sm"
                :disabled="!newTabTitle.trim()"
                @click="createNewTab"
              />
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="creatingTab = false"
              />
            </div>
            <UButton
              v-if="!creatingTab"
              icon="i-lucide-plus"
              color="neutral"
              variant="subtle"
              size="sm"
              @click="creatingTab = true"
            >
              New tab
            </UButton>
          </div>
        </UFormField>
      </template>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
      <UButton
        color="primary"
        :icon="kind === 'node' ? 'i-lucide-plus' : 'i-lucide-download'"
        :disabled="!canSubmit"
        @click="submit"
      >
        {{ kind === "node" ? "Add to Dashboard" : "Import" }}
      </UButton>
    </template>
  </UModal>
</template>
