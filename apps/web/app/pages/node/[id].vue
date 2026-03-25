<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import {
  cloneWorkspaceNodes,
  collectWorkspaceNodeTasks,
  createDefaultWorkspaceTab,
  createWorkspaceAiPromptBlock,
  createWorkspaceCustomBlock,
  createWorkspaceCustomBlockTemplate,
  createWorkspaceDecisionBlock,
  createWorkspaceId,
  createWorkspaceNotesBlock,
  createWorkspaceTask,
  createWorkspaceTaskListBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTrackerBlock,
  evaluateCustomBlockFormula,
  fillCustomBlockPromptTemplate,
  generateWorkspacePromptOutput,
  getDecisionSummary,
  getTaskListProgress,
  getTimeOrchestratorSummary,
  getTrackerTrend,
  getWorkspaceNodePreview,
  getWorkspaceNodeStats,
  normalizeWorkspaceNode,
  type WorkspaceBlock,
  type WorkspaceCollectedTask,
  type WorkspaceCustomBlock,
  type WorkspaceCustomBlockField,
  type WorkspaceCustomFieldType,
  type WorkspaceNode,
  type WorkspaceNodeTab,
  type WorkspaceTaskPriority,
} from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { formatDateTime } from "~/utils/format-date-time";
import { getErrorMessage } from "~/utils/get-error-message";

definePageMeta({
  middleware: ["auth"],
});

type SaveState = "idle" | "saving" | "saved" | "error";
type TabEditorMode = "create" | "rename";
type TemplateFieldDraft = {
  id: string;
  key: string;
  label: string;
  type: WorkspaceCustomFieldType;
};

const route = useRoute();
const authSession = useAuthSession();
const orpc = useOrpc();
const toast = useToast();

const workspaceQuery = useQuery({
  ...orpc.workspace.get.queryOptions(),
  enabled: computed(() => Boolean(authSession.value?.data?.user)),
  staleTime: Number.POSITIVE_INFINITY,
});

const saveWorkspace = useMutation(orpc.workspace.save.mutationOptions());

const nodeId = computed(() => String(route.params.id ?? ""));
const draftNodes = ref<WorkspaceNode[]>([]);
const loadApplied = ref(false);
const isHydrating = ref(false);
const saveState = ref<SaveState>("idle");
const saveError = ref<string | null>(null);
const emptyDropdownItems: DropdownMenuItem[][] = [];

const tabEditor = reactive({
  open: false,
  mode: "create" as TabEditorMode,
  title: "",
});

const templateForm = reactive({
  name: "",
  includeNotes: false,
  formulaEnabled: false,
  formulaLabel: "Calculated value",
  formulaExpression: "",
  aiPromptTemplate: "",
  fields: [createTemplateFieldDraft()],
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let latestSaveRequest = 0;

const workspaceReadyForEdits = computed(
  () =>
    Boolean(authSession.value?.data?.user) &&
    loadApplied.value &&
    !isHydrating.value,
);

const node = computed(() => {
  return draftNodes.value.find((entry) => entry.id === nodeId.value) ?? null;
});

const activeTabId = computed(() => node.value?.viewState.activeTabId ?? "");

const activeTab = computed(() => {
  if (!node.value) {
    return null;
  }

  return node.value.tabs.find((tab) => tab.id === activeTabId.value) ?? node.value.tabs[0] ?? null;
});

const saveBadge = computed(() => {
  switch (saveState.value) {
    case "saving":
      return {
        label: "Saving",
        className: "border-warning/40 bg-warning/10 text-warning",
      };
    case "saved":
      return {
        label: "Saved",
        className: "border-success/40 bg-success/10 text-success",
      };
    case "error":
      return {
        label: "Save failed",
        className: "border-error/40 bg-error/10 text-error",
      };
    default:
      return {
        label: "Ready",
        className: "border-muted/60 bg-elevated/80 text-toned",
      };
  }
});

const nodeStats = computed(() => (node.value ? getWorkspaceNodeStats(node.value) : null));
const nodePreview = computed(() =>
  node.value ? getWorkspaceNodePreview(node.value, 220) : "",
);
const nodeTimeSummary = computed(() =>
  node.value ? getTimeOrchestratorSummary(node.value) : null,
);
const nodeTaskLedger = computed(() =>
  node.value ? collectWorkspaceNodeTasks(node.value) : [],
);

const addBlockMenuItems = computed(() => {
  if (!activeTab.value || !node.value) {
    return emptyDropdownItems;
  }

  const groups: DropdownMenuItem[][] = [
    [
      {
        label: "Task list",
        icon: "i-lucide-list-checks",
        onSelect: () => {
          addBlockToActiveTab("task-list");
        },
      },
      {
        label: "Notes",
        icon: "i-lucide-notebook-tabs",
        onSelect: () => {
          addBlockToActiveTab("notes");
        },
      },
      {
        label: "Decision",
        icon: "i-lucide-scale",
        onSelect: () => {
          addBlockToActiveTab("decision");
        },
      },
      {
        label: "Tracker",
        icon: "i-lucide-chart-column",
        onSelect: () => {
          addBlockToActiveTab("tracker");
        },
      },
      {
        label: "AI prompt",
        icon: "i-lucide-sparkles",
        onSelect: () => {
          addBlockToActiveTab("ai-prompt");
        },
      },
      {
        label: "Time orchestrator",
        icon: "i-lucide-calendar-range",
        onSelect: () => {
          addBlockToActiveTab("time-orchestrator");
        },
      },
    ],
  ];

  if (node.value.customBlockTemplates.length > 0) {
    groups.push(
      node.value.customBlockTemplates.map((template) => ({
        label: template.name,
        description: "Create a custom block from this template",
        icon: "i-lucide-blocks",
        onSelect: () => {
          addCustomBlockToActiveTab(template.id);
        },
      })),
    );
  }

  return groups;
});

const priorityOptions = [
  { label: "None", value: "" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] satisfies Array<{ label: string; value: "" | WorkspaceTaskPriority }>;

const customFieldTypeOptions = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Textarea", value: "textarea" },
] satisfies Array<{ label: string; value: WorkspaceCustomFieldType }>;

watch(
  () => workspaceQuery.data.value?.nodes,
  (remoteNodes) => {
    if (!remoteNodes) {
      return;
    }

    isHydrating.value = true;
    draftNodes.value = cloneWorkspaceNodes(remoteNodes);
    loadApplied.value = true;
    saveState.value = "idle";
    saveError.value = null;
    syncActiveTab();

    nextTick(() => {
      isHydrating.value = false;
    });
  },
  { immediate: true },
);

watch(
  draftNodes,
  () => {
    if (!workspaceReadyForEdits.value) {
      return;
    }

    scheduleSave();
  },
  { deep: true },
);

watch(
  () => node.value?.tabs.map((tab) => tab.id).join(","),
  () => {
    syncActiveTab();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
});

function syncActiveTab() {
  const currentNode = node.value;

  if (!currentNode || currentNode.tabs.length === 0) {
    return;
  }

  if (!currentNode.tabs.some((tab) => tab.id === activeTabId.value)) {
    const nextTabId = currentNode.tabs[0]?.id ?? null;

    if (currentNode.viewState.activeTabId === nextTabId) {
      return;
    }

    mutateCurrentNode((entry) => {
      entry.viewState.activeTabId = nextTabId;
    });
  }
}

function setActiveTab(tabId: string) {
  if (!node.value || node.value.viewState.activeTabId === tabId) {
    return;
  }

  mutateCurrentNode((entry) => {
    entry.viewState.activeTabId = tabId;
  });
}

async function persistWorkspace(snapshot: WorkspaceNode[]) {
  const requestId = ++latestSaveRequest;

  try {
    await saveWorkspace.mutateAsync({
      nodes: snapshot,
    });

    if (requestId === latestSaveRequest) {
      saveState.value = "saved";
      saveError.value = null;
    }
  } catch (error) {
    if (requestId === latestSaveRequest) {
      saveState.value = "error";
      saveError.value = getErrorMessage(error, "Failed to save node changes");
    }
  }
}

function scheduleSave() {
  if (!workspaceReadyForEdits.value) {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveState.value = "saving";
  saveError.value = null;
  const snapshot = cloneWorkspaceNodes(draftNodes.value);

  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistWorkspace(snapshot);
  }, 350);
}

function updateDraftNodes(mutator: (nodes: WorkspaceNode[]) => void) {
  if (!workspaceReadyForEdits.value) {
    return;
  }

  const nextNodes = cloneWorkspaceNodes(draftNodes.value);
  mutator(nextNodes);
  draftNodes.value = nextNodes;
}

function mutateCurrentNode(mutator: (entry: WorkspaceNode, timestamp: string) => void) {
  updateDraftNodes((nodes) => {
    const index = nodes.findIndex((entry) => entry.id === nodeId.value);

    if (index < 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry = nodes[index]!;

    mutator(entry, timestamp);
    entry.label = entry.title;
    entry.updatedAt = timestamp;
    nodes[index] = normalizeWorkspaceNode(entry);
  });
}

function mutateTab(
  tabId: string,
  mutator: (tab: WorkspaceNodeTab, nodeEntry: WorkspaceNode, timestamp: string) => void,
) {
  mutateCurrentNode((entry, timestamp) => {
    const tab = entry.tabs.find((candidate) => candidate.id === tabId);

    if (!tab) {
      return;
    }

    mutator(tab, entry, timestamp);
    tab.updatedAt = timestamp;
  });
}

function mutateBlock(
  tabId: string,
  blockId: string,
  mutator: (
    block: WorkspaceBlock,
    tab: WorkspaceNodeTab,
    nodeEntry: WorkspaceNode,
    timestamp: string,
  ) => void,
) {
  mutateTab(tabId, (tab, entry, timestamp) => {
    const block = tab.blocks.find((candidate) => candidate.id === blockId);

    if (!block) {
      return;
    }

    mutator(block, tab, entry, timestamp);
    block.updatedAt = timestamp;
    tab.updatedAt = timestamp;
  });
}

function openTabEditor(mode: TabEditorMode) {
  if (!node.value) {
    return;
  }

  tabEditor.mode = mode;
  tabEditor.title = mode === "rename" ? getDisplayTabTitle(activeTab.value) : "";
  tabEditor.open = true;
}

function closeTabEditor() {
  tabEditor.open = false;
  tabEditor.title = "";
}

function submitTabEditor() {
  const title = tabEditor.title.trim() || "Untitled tab";

  if (tabEditor.mode === "create") {
    const nextTab = createDefaultWorkspaceTab(title);

    mutateCurrentNode((entry) => {
      entry.tabs.push(nextTab);
      entry.viewState.activeTabId = nextTab.id;
    });
  } else if (activeTab.value) {
    mutateTab(activeTab.value.id, (tab) => {
      tab.title = title;
    });
  }

  closeTabEditor();
}

function deleteActiveTab() {
  if (!node.value || !activeTab.value) {
    return;
  }

  const currentTabId = activeTab.value.id;
  const currentIndex = node.value.tabs.findIndex((tab) => tab.id === currentTabId);

  if (!window.confirm(`Delete "${getDisplayTabTitle(activeTab.value)}"?`)) {
    return;
  }

  mutateCurrentNode((entry) => {
    entry.tabs = entry.tabs.filter((tab) => tab.id !== currentTabId);

    if (entry.tabs.length === 0) {
      const fallbackTab = createDefaultWorkspaceTab("Overview", entry.content);
      entry.tabs = [fallbackTab];
      entry.viewState.activeTabId = fallbackTab.id;
      return;
    }

    const nextTab =
      entry.tabs[currentIndex] ?? entry.tabs[Math.max(0, currentIndex - 1)] ?? entry.tabs[0];

    entry.viewState.activeTabId = nextTab?.id ?? null;
  });
}

function addBlockToActiveTab(type: WorkspaceBlock["type"]) {
  if (!activeTab.value) {
    return;
  }

  let nextBlock: WorkspaceBlock;

  switch (type) {
    case "task-list":
      nextBlock = createWorkspaceTaskListBlock();
      break;
    case "notes":
      nextBlock = createWorkspaceNotesBlock();
      break;
    case "decision":
      nextBlock = createWorkspaceDecisionBlock();
      break;
    case "tracker":
      nextBlock = createWorkspaceTrackerBlock();
      break;
    case "ai-prompt":
      nextBlock = createWorkspaceAiPromptBlock();
      break;
    case "time-orchestrator":
      nextBlock = createWorkspaceTimeOrchestratorBlock();
      break;
    case "custom":
      return;
  }

  mutateTab(activeTab.value.id, (tab) => {
    tab.blocks.push(nextBlock);
  });
}

function addCustomBlockToActiveTab(templateId: string) {
  if (!activeTab.value || !node.value) {
    return;
  }

  const template = node.value.customBlockTemplates.find((entry) => entry.id === templateId);

  if (!template) {
    toast.add({
      title: "Template missing",
      description: "This custom block template no longer exists.",
      color: "error",
      icon: "i-lucide-alert-circle",
    });
    return;
  }

  const nextBlock = createWorkspaceCustomBlock(template);

  mutateTab(activeTab.value.id, (tab) => {
    tab.blocks.push(nextBlock);
  });
}

function removeBlock(tabId: string, blockId: string) {
  mutateTab(tabId, (tab) => {
    tab.blocks = tab.blocks.filter((block) => block.id !== blockId);
  });
}

function updateNodeSummary(value: string) {
  mutateCurrentNode((entry) => {
    entry.content = value;
  });
}

function updateBlockTitle(tabId: string, blockId: string, value: string) {
  mutateBlock(tabId, blockId, (block) => {
    block.title = value;
  });
}

function addTask(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "task-list") {
      return;
    }

    block.tasks.push(createWorkspaceTask());
  });
}

function mutateTask(
  tabId: string,
  blockId: string,
  taskId: string,
  mutator: (task: ReturnType<typeof createWorkspaceTask>) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "task-list") {
      return;
    }

    const task = block.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    mutator(task);
  });
}

function removeTask(tabId: string, blockId: string, taskId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "task-list") {
      return;
    }

    block.tasks = block.tasks.filter((task) => task.id !== taskId);
  });
}

function addDecisionItem(tabId: string, blockId: string, list: "pros" | "cons") {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "decision") {
      return;
    }

    block[list].push({
      id: createWorkspaceId("decision"),
      text: "",
      weight: 3,
    });
  });
}

function mutateDecisionItem(
  tabId: string,
  blockId: string,
  itemId: string,
  list: "pros" | "cons",
  mutator: (item: { id: string; text: string; weight: number }) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "decision") {
      return;
    }

    const item = block[list].find((entry) => entry.id === itemId);

    if (!item) {
      return;
    }

    mutator(item);
  });
}

function removeDecisionItem(
  tabId: string,
  blockId: string,
  itemId: string,
  list: "pros" | "cons",
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "decision") {
      return;
    }

    block[list] = block[list].filter((item) => item.id !== itemId);
  });
}

function addTrackerEntry(tabId: string, blockId: string) {
  mutateBlock(tabId, blockId, (block, _tab, _entry, timestamp) => {
    if (block.type !== "tracker") {
      return;
    }

    block.entries.push({
      id: createWorkspaceId("entry"),
      label: "",
      value: 0,
      createdAt: timestamp,
    });
  });
}

function mutateTrackerEntry(
  tabId: string,
  blockId: string,
  entryId: string,
  mutator: (entry: { id: string; label: string; value: number; createdAt: string }) => void,
) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "tracker") {
      return;
    }

    const trackerEntry = block.entries.find((entry) => entry.id === entryId);

    if (!trackerEntry) {
      return;
    }

    mutator(trackerEntry);
  });
}

function removeTrackerEntry(tabId: string, blockId: string, entryId: string) {
  mutateBlock(tabId, blockId, (block) => {
    if (block.type !== "tracker") {
      return;
    }

    block.entries = block.entries.filter((entry) => entry.id !== entryId);
  });
}

function runPromptBlock(tabId: string, blockId: string) {
  if (!node.value) {
    return;
  }

  const block = activeTab.value?.blocks.find(
    (candidate): candidate is Extract<WorkspaceBlock, { type: "ai-prompt" }> =>
      candidate.id === blockId && candidate.type === "ai-prompt",
  );

  if (!block || !block.prompt.trim()) {
    return;
  }

  const output = generateWorkspacePromptOutput(node.value, block.prompt);

  mutateBlock(tabId, blockId, (entry, _tab, _node, timestamp) => {
    if (entry.type !== "ai-prompt") {
      return;
    }

    entry.latestOutput = output;
    entry.outputHistory.unshift({
      id: createWorkspaceId("output"),
      prompt: entry.prompt,
      output,
      createdAt: timestamp,
    });
    entry.outputHistory = entry.outputHistory.slice(0, 8);
  });
}

function runCustomPrompt(tabId: string, blockId: string) {
  if (!node.value) {
    return;
  }

  const block = activeTab.value?.blocks.find(
    (candidate): candidate is WorkspaceCustomBlock =>
      candidate.id === blockId && candidate.type === "custom",
  );

  if (!block) {
    return;
  }

  const template = node.value.customBlockTemplates.find(
    (entry) => entry.id === block.definitionId,
  );

  if (!template) {
    return;
  }

  const prompt = fillCustomBlockPromptTemplate(template, block).trim();

  if (!prompt) {
    return;
  }

  const output = generateWorkspacePromptOutput(node.value, prompt);

  mutateBlock(tabId, blockId, (entry, _tab, _node, timestamp) => {
    if (entry.type !== "custom") {
      return;
    }

    entry.latestAiOutput = output;
    entry.outputHistory.unshift({
      id: createWorkspaceId("output"),
      prompt,
      output,
      createdAt: timestamp,
    });
    entry.outputHistory = entry.outputHistory.slice(0, 8);
  });
}

function toggleNotePreview(blockId: string) {
  mutateCurrentNode((entry) => {
    entry.viewState.notePreviewState = {
      ...entry.viewState.notePreviewState,
      [blockId]: !entry.viewState.notePreviewState?.[blockId],
    };
  });
}

function isNotePreviewEnabled(blockId: string) {
  return Boolean(node.value?.viewState.notePreviewState?.[blockId]);
}

function createTemplateFieldDraft(): TemplateFieldDraft {
  return {
    id: createWorkspaceId("field"),
    key: "",
    label: "",
    type: "text",
  };
}

function resetTemplateForm() {
  templateForm.name = "";
  templateForm.includeNotes = false;
  templateForm.formulaEnabled = false;
  templateForm.formulaLabel = "Calculated value";
  templateForm.formulaExpression = "";
  templateForm.aiPromptTemplate = "";
  templateForm.fields = [createTemplateFieldDraft()];
}

function addTemplateField() {
  templateForm.fields.push(createTemplateFieldDraft());
}

function removeTemplateField(fieldId: string) {
  templateForm.fields = templateForm.fields.filter((field) => field.id !== fieldId);

  if (templateForm.fields.length === 0) {
    templateForm.fields = [createTemplateFieldDraft()];
  }
}

function createFieldKey(label: string) {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  if (!normalized) {
    return `field_${Math.random().toString(36).slice(2, 6)}`;
  }

  if (/^[a-z]/.test(normalized)) {
    return normalized.slice(0, 40);
  }

  return `field_${normalized}`.slice(0, 40);
}

function syncTemplateFieldKey(field: TemplateFieldDraft, force = false) {
  if (!force && field.key.trim()) {
    return;
  }

  field.key = createFieldKey(field.label);
}

function submitTemplateForm() {
  const name = templateForm.name.trim();
  const fields = templateForm.fields
    .map((field) => ({
      id: field.id,
      label: field.label.trim(),
      key: (field.key.trim() || createFieldKey(field.label)).slice(0, 40),
      type: field.type,
    }))
    .filter((field) => field.label && field.key);

  if (!name || fields.length === 0) {
    toast.add({
      title: "Template incomplete",
      description: "Add a name and at least one custom field.",
      color: "warning",
      icon: "i-lucide-pencil-ruler",
    });
    return;
  }

  const nextTemplate = createWorkspaceCustomBlockTemplate({
    name,
    fields,
    includeNotes: templateForm.includeNotes,
    formula:
      templateForm.formulaEnabled && templateForm.formulaExpression.trim()
        ? {
            label: templateForm.formulaLabel.trim() || "Calculated value",
            expression: templateForm.formulaExpression.trim(),
          }
        : null,
    aiPromptTemplate: templateForm.aiPromptTemplate.trim() || null,
  });

  mutateCurrentNode((entry) => {
    entry.customBlockTemplates.unshift(nextTemplate);
  });

  resetTemplateForm();
  toast.add({
    title: "Template created",
    description: `${nextTemplate.name} is ready to use in this node.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

function deleteTemplate(templateId: string) {
  if (!node.value) {
    return;
  }

  const template = node.value.customBlockTemplates.find((entry) => entry.id === templateId);

  if (!template) {
    return;
  }

  const linkedBlocks = node.value.tabs.reduce(
    (count, tab) =>
      count +
      tab.blocks.filter(
        (block) => block.type === "custom" && block.definitionId === templateId,
      ).length,
    0,
  );

  const confirmation =
    linkedBlocks > 0
      ? `Delete "${template.name}" and remove ${linkedBlocks} custom block(s) built from it?`
      : `Delete "${template.name}"?`;

  if (!window.confirm(confirmation)) {
    return;
  }

  mutateCurrentNode((entry) => {
    entry.customBlockTemplates = entry.customBlockTemplates.filter(
      (candidate) => candidate.id !== templateId,
    );
    entry.tabs = entry.tabs.map((tab) => ({
      ...tab,
      blocks: tab.blocks.filter(
        (block) => !(block.type === "custom" && block.definitionId === templateId),
      ),
    }));
  });
}

function getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined) {
  return tab?.title.trim() || "Untitled tab";
}

function getDisplayBlockTitle(block: WorkspaceBlock) {
  return block.title.trim() || "Untitled block";
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "";
}

function getCheckedValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.checked ?? false;
}

function getSelectValue(event: Event) {
  return (event.target as HTMLSelectElement | null)?.value ?? "";
}

function toTaskPriority(value: string): WorkspaceTaskPriority | null {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

function toCustomFieldType(value: string): WorkspaceCustomFieldType {
  return value === "number" || value === "checkbox" || value === "textarea"
    ? value
    : "text";
}

function getCustomTemplate(definitionId: string) {
  return node.value?.customBlockTemplates.find((entry) => entry.id === definitionId) ?? null;
}

function getCustomFormulaResult(block: WorkspaceCustomBlock) {
  const template = getCustomTemplate(block.definitionId);

  return evaluateCustomBlockFormula(template?.formula?.expression, block.values);
}

function getCustomPromptPreview(block: WorkspaceCustomBlock) {
  const template = getCustomTemplate(block.definitionId);

  return template ? fillCustomBlockPromptTemplate(template, block) : "";
}

function getPriorityBadgeClass(priority: WorkspaceTaskPriority | null | undefined) {
  switch (priority) {
    case "high":
      return "border-error/40 bg-error/10 text-error";
    case "medium":
      return "border-warning/40 bg-warning/10 text-warning";
    case "low":
      return "border-success/40 bg-success/10 text-success";
    default:
      return "border-muted/60 bg-elevated/80 text-muted";
  }
}

function formatRelativeTaskMeta(item: WorkspaceCollectedTask) {
  const fragments = [`${item.tabTitle} / ${item.blockTitle}`];

  if (item.task.dueDate) {
    fragments.push(`Due ${item.task.dueDate}`);
  }

  if (item.task.priority) {
    fragments.push(`${item.task.priority} priority`);
  }

  return fragments.join(" • ");
}

function formatFormulaResult(value: number | null) {
  if (value === null) {
    return "Invalid formula";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderNotesPreview(input: string) {
  const escaped = input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const withFormatting = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");

  const lines = withFormatting.split("\n");
  const parts: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        parts.push('<ul class="ml-5 list-disc space-y-1">');
        inList = true;
      }

      parts.push(`<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`);
      continue;
    }

    if (inList) {
      parts.push("</ul>");
      inList = false;
    }

    if (!line.trim()) {
      parts.push('<div class="h-3"></div>');
      continue;
    }

    parts.push(`<p>${line}</p>`);
  }

  if (inList) {
    parts.push("</ul>");
  }

  return parts.join("") || "<p>Nothing to preview yet.</p>";
}
</script>

<template>
  <div class="h-full overflow-y-auto px-4 py-6 md:px-6 xl:px-10">
    <UAlert
      v-if="workspaceQuery.status.value === 'error'"
      color="error"
      icon="i-lucide-alert-circle"
      title="Workspace unavailable"
      :description="
        workspaceQuery.error.value?.message || 'The user workspace could not be loaded.'
      "
    />

    <div v-else-if="workspaceQuery.isLoading.value" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <template v-else-if="node && activeTab">
      <div class="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <section
          class="relative overflow-hidden rounded-[28px] border border-muted/70 bg-gradient-to-br from-elevated via-default to-primary/5 p-6 shadow-sm"
        >
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_38%)]" />

          <div class="relative flex flex-col gap-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <UButton
                  to="/dashboard"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-arrow-left"
                  class="-ml-2"
                >
                  Back to board
                </UButton>

                <span
                  class="rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]"
                  :class="saveBadge.className"
                >
                  {{ saveBadge.label }}
                </span>

                <span class="text-xs text-muted">
                  Updated {{ formatDateTime(node.updatedAt) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="soft">
                  {{ nodeStats?.tabsCount ?? 0 }} tabs
                </UBadge>
                <UBadge color="neutral" variant="soft">
                  {{ nodeStats?.blocksCount ?? 0 }} blocks
                </UBadge>
                <UBadge color="neutral" variant="soft">
                  {{ nodeStats?.completedTasks ?? 0 }}/{{ nodeStats?.totalTasks ?? 0 }} tasks done
                </UBadge>
              </div>
            </div>

            <div class="grid gap-6 xl:grid-cols-12">
              <div class="space-y-4 xl:col-span-8">
                <div>
                  <p class="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                    Node Workspace
                  </p>
                  <h1 class="text-3xl font-semibold tracking-tight text-highlighted md:text-4xl">
                    {{ node.title }}
                  </h1>
                </div>

                <UFormField
                  label="Board Summary"
                  description="Optional summary text for the canvas card preview."
                >
                  <UTextarea
                    :model-value="node.content"
                    :rows="4"
                    autoresize
                    placeholder="Capture the purpose of this node in one or two concise paragraphs."
                    @update:model-value="updateNodeSummary($event ?? '')"
                  />
                </UFormField>
              </div>

              <div class="space-y-4 xl:col-span-4">
                <div class="rounded-2xl border border-muted/60 bg-default/90 p-4">
                  <p class="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    Snapshot
                  </p>
                  <p class="mt-3 text-sm leading-relaxed text-toned">
                    {{ nodePreview }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-2xl border border-muted/60 bg-default/90 p-4">
                      <p class="text-xs uppercase tracking-[0.2em] text-muted">Overdue</p>
                      <p class="mt-2 text-2xl font-semibold text-highlighted">
                      {{ nodeTimeSummary?.overdue.length ?? 0 }}
                      </p>
                    </div>

                  <div class="rounded-2xl border border-muted/60 bg-default/90 p-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-muted">High Priority</p>
                    <p class="mt-2 text-2xl font-semibold text-highlighted">
                      {{ nodeTimeSummary?.highPriority.length ?? 0 }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="grid gap-6 xl:grid-cols-12">
          <div class="space-y-6 xl:col-span-8">
            <section class="rounded-[24px] border border-muted/60 bg-default p-5 shadow-sm">
              <div class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      v-for="tab in node.tabs"
                      :key="tab.id"
                      type="button"
                      class="rounded-full border px-4 py-2 text-sm font-medium transition"
                      :class="
                        tab.id === activeTabId
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-muted/60 bg-elevated/70 text-toned hover:border-primary/30 hover:text-highlighted'
                      "
                      @click="setActiveTab(tab.id)"
                    >
                      {{ getDisplayTabTitle(tab) }}
                    </button>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-pencil"
                      @click="openTabEditor('rename')"
                    >
                      Rename tab
                    </UButton>

                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      @click="deleteActiveTab"
                    >
                      Delete tab
                    </UButton>

                    <UButton
                      color="primary"
                      variant="soft"
                      icon="i-lucide-plus"
                      @click="openTabEditor('create')"
                    >
                      New tab
                    </UButton>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-muted/70 bg-elevated/40 p-4">
                  <div>
                    <p class="text-sm font-medium text-highlighted">
                      {{ getDisplayTabTitle(activeTab) }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ activeTab.blocks.length }} block{{ activeTab.blocks.length === 1 ? "" : "s" }}
                      in this tab
                    </p>
                  </div>

                  <UDropdownMenu :items="addBlockMenuItems">
                    <UButton color="primary" icon="i-lucide-layout-panel-top">
                      Add block
                    </UButton>
                  </UDropdownMenu>
                </div>

                <div v-if="activeTab.blocks.length === 0" class="rounded-2xl border border-dashed border-muted/70 bg-elevated/30 p-10 text-center">
                  <p class="text-base font-medium text-highlighted">This tab is empty.</p>
                  <p class="mt-2 text-sm text-muted">
                    Add a block to start structuring tasks, notes, decisions, or custom content.
                  </p>
                </div>

                <div v-else class="space-y-5">
                  <UCard
                    v-for="block in activeTab.blocks"
                    :key="block.id"
                    :ui="{
                      body: 'space-y-5',
                      header: 'flex flex-wrap items-center justify-between gap-3',
                    }"
                    class="rounded-[24px] border border-muted/60"
                  >
                    <template #header>
                      <div class="flex min-w-0 flex-1 items-center gap-3">
                        <UInput
                          :model-value="block.title"
                          size="lg"
                          variant="none"
                          placeholder="Untitled block"
                          class="w-full"
                          :ui="{
                            base: 'px-0 text-lg font-semibold text-highlighted placeholder:text-muted',
                          }"
                          @update:model-value="updateBlockTitle(activeTab.id, block.id, $event ?? '')"
                        />

                        <UBadge color="neutral" variant="soft">
                          {{ block.type }}
                        </UBadge>
                      </div>

                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        @click="removeBlock(activeTab.id, block.id)"
                      />
                    </template>

                    <template v-if="block.type === 'task-list'">
                      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                        <div>
                          <p class="text-sm font-medium text-highlighted">
                            Progress
                          </p>
                          <p class="text-sm text-muted">
                            {{ getTaskListProgress(block).completed }}/{{ getTaskListProgress(block).total }}
                            tasks complete
                          </p>
                        </div>

                        <div class="min-w-[220px] flex-1">
                          <UProgress
                            :model-value="getTaskListProgress(block).completed"
                            :max="Math.max(getTaskListProgress(block).total, 1)"
                            status
                          />
                        </div>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="task in block.tasks"
                          :key="task.id"
                          class="grid gap-3 rounded-2xl border border-muted/60 bg-default p-4 lg:grid-cols-[auto_minmax(0,1fr)_150px_120px_auto]"
                        >
                          <label class="mt-2 flex items-start justify-center">
                            <input
                              :checked="task.completed"
                              type="checkbox"
                              class="size-4 rounded border border-muted/80 text-primary focus:ring-primary"
                              @change="
                                mutateTask(activeTab.id, block.id, task.id, (entry) => {
                                  entry.completed = getCheckedValue($event);
                                })
                              "
                            />
                          </label>

                          <UInput
                            :model-value="task.text"
                            placeholder="Task description"
                            @update:model-value="
                              mutateTask(activeTab.id, block.id, task.id, (entry) => {
                                entry.text = ($event ?? '').slice(0, 240);
                              })
                            "
                          />

                          <input
                            :value="task.dueDate ?? ''"
                            type="date"
                            class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            @change="
                              mutateTask(activeTab.id, block.id, task.id, (entry) => {
                                const value = getInputValue($event);
                                entry.dueDate = value || null;
                              })
                            "
                          />

                          <select
                            :value="task.priority ?? ''"
                            class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            @change="
                              mutateTask(activeTab.id, block.id, task.id, (entry) => {
                                entry.priority = toTaskPriority(getSelectValue($event));
                              })
                            "
                          >
                            <option
                              v-for="option in priorityOptions"
                              :key="option.label"
                              :value="option.value"
                            >
                              {{ option.label }}
                            </option>
                          </select>

                          <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-x"
                            @click="removeTask(activeTab.id, block.id, task.id)"
                          />

                          <div class="lg:col-span-5 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <UBadge
                              color="neutral"
                              variant="subtle"
                              :class="getPriorityBadgeClass(task.priority)"
                            >
                              {{ task.priority || "No priority" }}
                            </UBadge>
                            <span v-if="task.dueDate">Due {{ task.dueDate }}</span>
                          </div>
                        </div>
                      </div>

                      <UButton
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-plus"
                        @click="addTask(activeTab.id, block.id)"
                      >
                        Add task
                      </UButton>
                    </template>

                    <template v-else-if="block.type === 'notes'">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <p class="text-sm text-muted">
                          Autosaves while you type. Simple formatting supports `**bold**`, `*italic*`,
                          and bullet lines starting with `-`.
                        </p>

                        <UButton
                          color="neutral"
                          variant="ghost"
                          :icon="isNotePreviewEnabled(block.id) ? 'i-lucide-pencil' : 'i-lucide-eye'"
                          @click="toggleNotePreview(block.id)"
                        >
                          {{ isNotePreviewEnabled(block.id) ? "Edit" : "Preview" }}
                        </UButton>
                      </div>

                      <div
                        v-if="isNotePreviewEnabled(block.id)"
                        class="prose prose-sm max-w-none rounded-2xl border border-muted/60 bg-elevated/30 p-4 text-toned"
                        v-html="renderNotesPreview(block.body)"
                      />

                      <UTextarea
                        v-else
                        :model-value="block.body"
                        :rows="12"
                        autoresize
                        placeholder="Write notes, meeting context, or working drafts here."
                        @update:model-value="
                          mutateBlock(activeTab.id, block.id, (entry) => {
                            if (entry.type !== 'notes') {
                              return;
                            }

                            entry.body = $event ?? '';
                          })
                        "
                      />
                    </template>

                    <template v-else-if="block.type === 'decision'">
                      <div class="grid gap-4 lg:grid-cols-2">
                        <div class="space-y-3 rounded-2xl border border-success/30 bg-success/5 p-4">
                          <div class="flex items-center justify-between gap-3">
                            <p class="font-medium text-highlighted">Pros</p>
                            <UButton
                              color="success"
                              variant="soft"
                              icon="i-lucide-plus"
                              size="sm"
                              @click="addDecisionItem(activeTab.id, block.id, 'pros')"
                            >
                              Add
                            </UButton>
                          </div>

                          <div v-if="block.pros.length === 0" class="text-sm text-muted">
                            Add reasons in favor of this decision.
                          </div>

                          <div
                            v-for="item in block.pros"
                            :key="item.id"
                            class="grid gap-3 rounded-2xl border border-success/20 bg-default p-3 md:grid-cols-[minmax(0,1fr)_88px_auto]"
                          >
                            <UInput
                              :model-value="item.text"
                              placeholder="Pro point"
                              @update:model-value="
                                mutateDecisionItem(activeTab.id, block.id, item.id, 'pros', (entry) => {
                                  entry.text = ($event ?? '').slice(0, 240);
                                })
                              "
                            />

                            <input
                              :value="item.weight"
                              type="number"
                              min="1"
                              max="5"
                            class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            @change="
                              mutateDecisionItem(activeTab.id, block.id, item.id, 'pros', (entry) => {
                                  const value = Number(getInputValue($event) || 3);
                                  entry.weight = Math.min(5, Math.max(1, Math.round(value)));
                                })
                              "
                            />

                            <UButton
                              color="neutral"
                              variant="ghost"
                              icon="i-lucide-x"
                              @click="removeDecisionItem(activeTab.id, block.id, item.id, 'pros')"
                            />
                          </div>
                        </div>

                        <div class="space-y-3 rounded-2xl border border-error/30 bg-error/5 p-4">
                          <div class="flex items-center justify-between gap-3">
                            <p class="font-medium text-highlighted">Cons</p>
                            <UButton
                              color="error"
                              variant="soft"
                              icon="i-lucide-plus"
                              size="sm"
                              @click="addDecisionItem(activeTab.id, block.id, 'cons')"
                            >
                              Add
                            </UButton>
                          </div>

                          <div v-if="block.cons.length === 0" class="text-sm text-muted">
                            Add concerns, risks, or tradeoffs.
                          </div>

                          <div
                            v-for="item in block.cons"
                            :key="item.id"
                            class="grid gap-3 rounded-2xl border border-error/20 bg-default p-3 md:grid-cols-[minmax(0,1fr)_88px_auto]"
                          >
                            <UInput
                              :model-value="item.text"
                              placeholder="Con point"
                              @update:model-value="
                                mutateDecisionItem(activeTab.id, block.id, item.id, 'cons', (entry) => {
                                  entry.text = ($event ?? '').slice(0, 240);
                                })
                              "
                            />

                            <input
                              :value="item.weight"
                              type="number"
                              min="1"
                              max="5"
                            class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            @change="
                              mutateDecisionItem(activeTab.id, block.id, item.id, 'cons', (entry) => {
                                  const value = Number(getInputValue($event) || 3);
                                  entry.weight = Math.min(5, Math.max(1, Math.round(value)));
                                })
                              "
                            />

                            <UButton
                              color="neutral"
                              variant="ghost"
                              icon="i-lucide-x"
                              @click="removeDecisionItem(activeTab.id, block.id, item.id, 'cons')"
                            />
                          </div>
                        </div>
                      </div>

                      <div class="grid gap-4 md:grid-cols-3">
                        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Pros Weight</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ getDecisionSummary(block).prosWeight }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Cons Weight</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ getDecisionSummary(block).consWeight }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Signal</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ getDecisionSummary(block).signal }}
                          </p>
                        </div>
                      </div>

                      <UFormField label="Final Recommendation">
                        <UTextarea
                          :model-value="block.recommendation"
                          :rows="4"
                          autoresize
                          placeholder="State the decision you intend to make and why."
                          @update:model-value="
                            mutateBlock(activeTab.id, block.id, (entry) => {
                              if (entry.type !== 'decision') {
                                return;
                              }

                              entry.recommendation = $event ?? '';
                            })
                          "
                        />
                      </UFormField>
                    </template>

                    <template v-else-if="block.type === 'tracker'">
                      <div class="grid gap-4 md:grid-cols-3">
                        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Entries</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ block.entries.length }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Trend</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ getTrackerTrend(block).direction }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-muted/60 bg-elevated/40 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Delta</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ getTrackerTrend(block).delta }}
                          </p>
                        </div>
                      </div>

                      <div v-if="getTrackerTrend(block).points.length > 0" class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
                        <div class="flex h-20 items-end gap-2">
                          <div
                            v-for="(point, index) in getTrackerTrend(block).points"
                            :key="`${block.id}-${index}`"
                            class="min-w-0 flex-1 rounded-t bg-primary/55"
                            :style="{ height: `${Math.max(point, 8)}%` }"
                          />
                        </div>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="entry in block.entries"
                          :key="entry.id"
                          class="grid gap-3 rounded-2xl border border-muted/60 bg-default p-4 md:grid-cols-[minmax(0,1fr)_140px_auto]"
                        >
                          <UInput
                            :model-value="entry.label"
                            placeholder="Entry label"
                            @update:model-value="
                              mutateTrackerEntry(activeTab.id, block.id, entry.id, (item) => {
                                item.label = ($event ?? '').slice(0, 120);
                              })
                            "
                          />

                          <input
                            :value="entry.value"
                            type="number"
                            step="0.1"
                            class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            @change="
                              mutateTrackerEntry(activeTab.id, block.id, entry.id, (item) => {
                                item.value = Number(getInputValue($event) || 0);
                              })
                            "
                          />

                          <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-x"
                            @click="removeTrackerEntry(activeTab.id, block.id, entry.id)"
                          />
                        </div>
                      </div>

                      <UButton
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-plus"
                        @click="addTrackerEntry(activeTab.id, block.id)"
                      >
                        Add entry
                      </UButton>
                    </template>

                    <template v-else-if="block.type === 'ai-prompt'">
                      <UFormField label="Prompt">
                        <UTextarea
                          :model-value="block.prompt"
                          :rows="6"
                          autoresize
                          placeholder="Ask for a structured summary, next actions, or a recommendation. Output only updates when you click Run."
                          @update:model-value="
                            mutateBlock(activeTab.id, block.id, (entry) => {
                              if (entry.type !== 'ai-prompt') {
                                return;
                              }

                              entry.prompt = $event ?? '';
                            })
                          "
                        />
                      </UFormField>

                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <p class="text-sm text-muted">
                          Previous outputs are stored inside this block.
                        </p>

                        <UButton
                          color="primary"
                          icon="i-lucide-play"
                          :disabled="!block.prompt.trim()"
                          @click="runPromptBlock(activeTab.id, block.id)"
                        >
                          Run
                        </UButton>
                      </div>

                      <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
                        <p class="text-xs uppercase tracking-[0.2em] text-muted">Latest Output</p>
                        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
                          {{ block.latestOutput || "Run the prompt to capture an output snapshot." }}
                        </p>
                      </div>

                      <div v-if="block.outputHistory.length > 0" class="space-y-3">
                        <p class="text-sm font-medium text-highlighted">History</p>
                        <div
                          v-for="entry in block.outputHistory"
                          :key="entry.id"
                          class="rounded-2xl border border-muted/60 bg-default p-4"
                        >
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <p class="text-xs uppercase tracking-[0.2em] text-muted">
                              {{ formatDateTime(entry.createdAt) }}
                            </p>
                            <UBadge color="neutral" variant="soft">Saved output</UBadge>
                          </div>
                          <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
                            {{ entry.output }}
                          </p>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="block.type === 'time-orchestrator'">
                      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-2xl border border-error/30 bg-error/5 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Overdue</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ nodeTimeSummary?.overdue.length ?? 0 }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-info/30 bg-info/5 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Upcoming</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ nodeTimeSummary?.upcoming.length ?? 0 }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-warning/30 bg-warning/5 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">High Priority</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ nodeTimeSummary?.highPriority.length ?? 0 }}
                          </p>
                        </div>

                        <div class="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">Suggested</p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ nodeTimeSummary?.suggestedNextActions.length ?? 0 }}
                          </p>
                        </div>
                      </div>

                      <div class="grid gap-4 xl:grid-cols-2">
                        <div class="rounded-2xl border border-muted/60 bg-default p-4">
                          <p class="text-sm font-medium text-highlighted">Suggested next actions</p>
                          <div class="mt-3 space-y-3">
                            <div
                              v-for="item in nodeTimeSummary?.suggestedNextActions ?? []"
                              :key="`${block.id}-${item.task.id}`"
                              class="rounded-2xl border border-muted/60 bg-elevated/30 p-3"
                            >
                              <p class="font-medium text-highlighted">
                                {{ item.task.text || "Untitled task" }}
                              </p>
                              <p class="mt-1 text-sm text-muted">
                                {{ formatRelativeTaskMeta(item) }}
                              </p>
                            </div>

                            <p
                              v-if="(nodeTimeSummary?.suggestedNextActions.length ?? 0) === 0"
                              class="text-sm text-muted"
                            >
                              No open tasks found in this node.
                            </p>
                          </div>
                        </div>

                        <div class="grid gap-4">
                          <div class="rounded-2xl border border-muted/60 bg-default p-4">
                            <p class="text-sm font-medium text-highlighted">Overdue</p>
                            <div class="mt-3 space-y-2">
                              <p
                                v-for="item in nodeTimeSummary?.overdue ?? []"
                                :key="`overdue-${item.task.id}`"
                                class="text-sm text-toned"
                              >
                                {{ item.task.text || "Untitled task" }} · {{ formatRelativeTaskMeta(item) }}
                              </p>
                              <p
                                v-if="(nodeTimeSummary?.overdue.length ?? 0) === 0"
                                class="text-sm text-muted"
                              >
                                Nothing overdue.
                              </p>
                            </div>
                          </div>

                          <div class="rounded-2xl border border-muted/60 bg-default p-4">
                            <p class="text-sm font-medium text-highlighted">Upcoming</p>
                            <div class="mt-3 space-y-2">
                              <p
                                v-for="item in nodeTimeSummary?.upcoming ?? []"
                                :key="`upcoming-${item.task.id}`"
                                class="text-sm text-toned"
                              >
                                {{ item.task.text || "Untitled task" }} · {{ formatRelativeTaskMeta(item) }}
                              </p>
                              <p
                                v-if="(nodeTimeSummary?.upcoming.length ?? 0) === 0"
                                class="text-sm text-muted"
                              >
                                No tasks due in the next seven days.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="block.type === 'custom'">
                      <div
                        v-if="!getCustomTemplate(block.definitionId)"
                        class="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
                      >
                        This block's template was removed. Delete the block or recreate the template.
                      </div>

                      <template v-else>
                        <div class="flex flex-wrap items-center gap-2">
                          <UBadge color="neutral" variant="soft">
                            {{
                              getCustomTemplate(block.definitionId)?.name
                            }}
                          </UBadge>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                          <template
                            v-for="field in getCustomTemplate(block.definitionId)?.fields ?? []"
                            :key="field.id"
                          >
                            <UFormField :label="field.label">
                              <template v-if="field.type === 'textarea'">
                                <UTextarea
                                  :model-value="String(block.values[field.key] ?? '')"
                                  :rows="4"
                                  autoresize
                                  @update:model-value="
                                    mutateBlock(activeTab.id, block.id, (entry) => {
                                      if (entry.type !== 'custom') {
                                        return;
                                      }

                                      entry.values[field.key] = $event ?? '';
                                    })
                                  "
                                />
                              </template>

                              <template v-else-if="field.type === 'checkbox'">
                                <label class="flex items-center gap-3 rounded-2xl border border-muted/60 bg-elevated/30 px-4 py-3">
                                  <input
                                    :checked="Boolean(block.values[field.key])"
                                    type="checkbox"
                                    class="size-4 rounded border border-muted/80 text-primary focus:ring-primary"
                                    @change="
                                      mutateBlock(activeTab.id, block.id, (entry) => {
                                        if (entry.type !== 'custom') {
                                          return;
                                        }

                                        entry.values[field.key] = getCheckedValue($event);
                                      })
                                    "
                                  />
                                  <span class="text-sm text-toned">Checked</span>
                                </label>
                              </template>

                              <template v-else>
                                <UInput
                                  :model-value="String(block.values[field.key] ?? '')"
                                  :type="field.type === 'number' ? 'number' : 'text'"
                                  @update:model-value="
                                    mutateBlock(activeTab.id, block.id, (entry) => {
                                      if (entry.type !== 'custom') {
                                        return;
                                      }

                                      entry.values[field.key] =
                                        field.type === 'number'
                                          ? Number($event ?? 0)
                                          : ($event ?? '');
                                    })
                                  "
                                />
                              </template>
                            </UFormField>
                          </template>
                        </div>

                        <div
                          v-if="getCustomTemplate(block.definitionId)?.formula"
                          class="rounded-2xl border border-muted/60 bg-elevated/30 p-4"
                        >
                          <p class="text-xs uppercase tracking-[0.2em] text-muted">
                            {{ getCustomTemplate(block.definitionId)?.formula?.label }}
                          </p>
                          <p class="mt-2 text-2xl font-semibold text-highlighted">
                            {{ formatFormulaResult(getCustomFormulaResult(block)) }}
                          </p>
                        </div>

                        <UFormField
                          v-if="getCustomTemplate(block.definitionId)?.includeNotes"
                          label="Notes"
                        >
                          <UTextarea
                            :model-value="block.notes"
                            :rows="4"
                            autoresize
                            @update:model-value="
                              mutateBlock(activeTab.id, block.id, (entry) => {
                                if (entry.type !== 'custom') {
                                  return;
                                }

                                entry.notes = $event ?? '';
                              })
                            "
                          />
                        </UFormField>

                        <div
                          v-if="getCustomTemplate(block.definitionId)?.aiPromptTemplate"
                          class="space-y-3 rounded-2xl border border-muted/60 bg-default p-4"
                        >
                          <p class="text-sm font-medium text-highlighted">AI Prompt Template</p>
                          <p class="text-sm text-muted">
                            {{ getCustomPromptPreview(block) }}
                          </p>

                          <div class="flex justify-end">
                            <UButton
                              color="primary"
                              variant="soft"
                              icon="i-lucide-play"
                              @click="runCustomPrompt(activeTab.id, block.id)"
                            >
                              Run template
                            </UButton>
                          </div>

                          <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
                            <p class="text-xs uppercase tracking-[0.2em] text-muted">Latest Output</p>
                            <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
                              {{ block.latestAiOutput || "Run the template to capture output." }}
                            </p>
                          </div>
                        </div>
                      </template>
                    </template>
                  </UCard>
                </div>
              </div>
            </section>
          </div>

          <aside class="space-y-6 xl:col-span-4">
            <section class="rounded-[24px] border border-muted/60 bg-default p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    Custom Block Builder
                  </p>
                  <p class="mt-2 text-sm text-muted">
                    Define lightweight templates with fields, notes, a formula, and an optional prompt template.
                  </p>
                </div>
              </div>

              <div class="mt-5 space-y-4">
                <UFormField label="Template title">
                  <UInput
                    :model-value="templateForm.name"
                    placeholder="Weekly review"
                    @update:model-value="templateForm.name = $event ?? ''"
                  />
                </UFormField>

                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-medium text-highlighted">Fields</p>
                    <UButton
                      color="neutral"
                      variant="soft"
                      size="sm"
                      icon="i-lucide-plus"
                      @click="addTemplateField"
                    >
                      Add field
                    </UButton>
                  </div>

                  <div
                    v-for="field in templateForm.fields"
                    :key="field.id"
                    class="grid gap-3 rounded-2xl border border-muted/60 bg-elevated/30 p-4"
                  >
                    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
                      <UInput
                        :model-value="field.label"
                        placeholder="Field label"
                        @update:model-value="
                          field.label = $event ?? '';
                          syncTemplateFieldKey(field);
                        "
                      />

                      <select
                        :value="field.type"
                        class="w-full rounded-xl border border-muted bg-default px-3 py-2 text-sm text-default outline-none ring-inset transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        @change="
                          field.type = toCustomFieldType(getSelectValue($event))
                        "
                      >
                        <option
                          v-for="option in customFieldTypeOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>

                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-x"
                        @click="removeTemplateField(field.id)"
                      />
                    </div>

                    <UInput
                      :model-value="field.key"
                      placeholder="field_key"
                      @update:model-value="field.key = ($event ?? '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()"
                    />
                  </div>
                </div>

                <label class="flex items-center gap-3 rounded-2xl border border-muted/60 bg-elevated/30 px-4 py-3">
                  <input
                    :checked="templateForm.includeNotes"
                    type="checkbox"
                    class="size-4 rounded border border-muted/80 text-primary focus:ring-primary"
                    @change="templateForm.includeNotes = getCheckedValue($event)"
                  />
                  <span class="text-sm text-toned">Include notes area</span>
                </label>

                <label class="flex items-center gap-3 rounded-2xl border border-muted/60 bg-elevated/30 px-4 py-3">
                  <input
                    :checked="templateForm.formulaEnabled"
                    type="checkbox"
                    class="size-4 rounded border border-muted/80 text-primary focus:ring-primary"
                    @change="templateForm.formulaEnabled = getCheckedValue($event)"
                  />
                  <span class="text-sm text-toned">Include formula field</span>
                </label>

                <div v-if="templateForm.formulaEnabled" class="grid gap-3 rounded-2xl border border-muted/60 bg-elevated/30 p-4">
                  <UInput
                    :model-value="templateForm.formulaLabel"
                    placeholder="Formula label"
                    @update:model-value="templateForm.formulaLabel = $event ?? ''"
                  />
                  <UInput
                    :model-value="templateForm.formulaExpression"
                    placeholder="budget - spend"
                    @update:model-value="templateForm.formulaExpression = $event ?? ''"
                  />
                  <p class="text-xs text-muted">
                    Use numeric field keys with +, -, *, /, and parentheses.
                  </p>
                </div>

                <UFormField label="Optional AI prompt template">
                  <UTextarea
                    :model-value="templateForm.aiPromptTemplate"
                    :rows="4"
                    autoresize
                    placeholder="Summarize the status of {{goal}} given the values above."
                    @update:model-value="templateForm.aiPromptTemplate = $event ?? ''"
                  />
                </UFormField>

                <div class="flex justify-end">
                  <UButton color="primary" icon="i-lucide-blocks" @click="submitTemplateForm">
                    Save template
                  </UButton>
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-muted/60 bg-default p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    Templates
                  </p>
                  <p class="mt-2 text-sm text-muted">
                    Create blocks from any saved template inside the active tab.
                  </p>
                </div>
              </div>

              <div class="mt-5 space-y-3">
                <div
                  v-for="template in node.customBlockTemplates"
                  :key="template.id"
                  class="rounded-2xl border border-muted/60 bg-elevated/30 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">{{ template.name }}</p>
                      <p class="mt-1 text-sm text-muted">
                        {{ template.fields.length }} fields
                        <span v-if="template.includeNotes"> • notes</span>
                        <span v-if="template.formula"> • formula</span>
                        <span v-if="template.aiPromptTemplate"> • AI prompt</span>
                      </p>
                    </div>

                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      @click="deleteTemplate(template.id)"
                    />
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-2">
                    <UBadge
                      v-for="field in template.fields"
                      :key="field.id"
                      color="neutral"
                      variant="soft"
                    >
                      {{ field.label }}
                    </UBadge>
                  </div>

                  <div class="mt-4 flex justify-end">
                    <UButton
                      color="primary"
                      variant="soft"
                      icon="i-lucide-plus"
                      @click="addCustomBlockToActiveTab(template.id)"
                    >
                      Add to active tab
                    </UButton>
                  </div>
                </div>

                <div
                  v-if="node.customBlockTemplates.length === 0"
                  class="rounded-2xl border border-dashed border-muted/70 bg-elevated/20 p-6 text-sm text-muted"
                >
                  No custom templates yet.
                </div>
              </div>
            </section>

            <section class="rounded-[24px] border border-muted/60 bg-default p-5 shadow-sm">
              <p class="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Task Ledger
              </p>

              <div class="mt-4 space-y-3">
                <div
                  v-for="item in nodeTaskLedger.slice(0, 8)"
                  :key="`ledger-${item.task.id}`"
                  class="rounded-2xl border border-muted/60 bg-elevated/30 p-4"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="font-medium text-highlighted">
                      {{ item.task.text || "Untitled task" }}
                    </p>
                    <UBadge
                      color="neutral"
                      variant="subtle"
                      :class="getPriorityBadgeClass(item.task.priority)"
                    >
                      {{ item.task.priority || "No priority" }}
                    </UBadge>
                  </div>
                  <p class="mt-2 text-sm text-muted">
                    {{ formatRelativeTaskMeta(item) }}
                  </p>
                </div>

                <div
                  v-if="nodeTaskLedger.length === 0"
                  class="rounded-2xl border border-dashed border-muted/70 bg-elevated/20 p-6 text-sm text-muted"
                >
                  No tasks captured in this node yet.
                </div>
              </div>
            </section>
          </aside>
        </div>

        <UAlert
          v-if="saveError"
          color="error"
          variant="soft"
          icon="i-lucide-cloud-off"
          title="Unable to persist node changes"
          :description="saveError"
        />
      </div>

      <UModal
        :open="tabEditor.open"
        :title="tabEditor.mode === 'create' ? 'Create tab' : 'Rename tab'"
        :description="
          tabEditor.mode === 'create'
            ? 'Create a new tab inside this node.'
            : 'Update the active tab title.'
        "
        :ui="{
          content: 'sm:max-w-md',
          body: 'space-y-4',
          footer: 'flex items-center justify-end gap-3',
        }"
        @update:open="(value) => !value && closeTabEditor()"
      >
        <template #body>
          <UFormField label="Tab title">
            <UInput
              :model-value="tabEditor.title"
              autofocus
              placeholder="Overview"
              @update:model-value="tabEditor.title = $event ?? ''"
            />
          </UFormField>
        </template>

        <template #footer>
          <UButton color="neutral" variant="ghost" @click="closeTabEditor">
            Cancel
          </UButton>
          <UButton color="primary" icon="i-lucide-save" @click="submitTabEditor">
            {{ tabEditor.mode === "create" ? "Create tab" : "Save tab" }}
          </UButton>
        </template>
      </UModal>
    </template>

    <div v-else class="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <UAlert
        color="warning"
        icon="i-lucide-search-x"
        title="Node not found"
        description="This node is not in your workspace. It may have been removed, or the link is invalid."
      />
      <UButton to="/dashboard" color="neutral" variant="soft">
        Return to dashboard
      </UButton>
    </div>
  </div>
</template>
