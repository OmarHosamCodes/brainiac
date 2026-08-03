import { stepCountIs } from "@openrouter/sdk/lib/stop-conditions";

import {
  agencyDraftPlanSchema,
  agencyProposalSnapshotSchema,
  type AgencyDraftPlan,
} from "./agency-actions";
import { buildAgencyAgentTools } from "./agency-tools";
import { bootstrapAgencyMonthReportsCanvas } from "./agency-reports-canvas";
import { createOpenRouterClient } from "./client";
import { resolveOpenRouterModel } from "./models";
import {
  mergeToolCallFromStreamMessage,
  orderedToolCalls,
  type DashboardAgentStreamEvent,
} from "./stream-turn";
import {
  buildDashboardAgentTools,
  buildWorkspaceOverview,
  createDashboardAgentWorkspaceRuntime,
  summarizeBlock,
  type DashboardAgentWorkspaceRuntime,
} from "./tools";
import {
  DEFAULT_AGENT_MODEL,
  type AgentChatResponse,
  type AgentModelInputMessage,
  type AgentToolCall,
  type DashboardAgentConfig,
  type DashboardAgentToolPreset,
  type DashboardAgentWorkspaceContext,
  type DashboardConversationUsageLatest,
} from "./types";
import {
  artifactFromToolCall,
  cappedArtifacts,
  UI_PRESENT_SYSTEM_GUIDANCE,
  type AiUiArtifact,
} from "./ui-artifact";

type OpenRouterUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number | null;
  inputTokensDetails?: {
    cachedTokens?: number | null;
  } | null;
  outputTokensDetails?: {
    reasoningTokens?: number | null;
  } | null;
};

function getScopedWorkspaceNodes(workspace: DashboardAgentWorkspaceContext) {
  if (workspace.scopeNodes && workspace.scopeNodes.length > 0) {
    return workspace.scopeNodes;
  }

  return workspace.nodes;
}

function hasScopedWorkspace(workspace: DashboardAgentWorkspaceContext) {
  if (!workspace.scopeNodes || workspace.scopeNodes.length === 0) {
    return false;
  }

  if (workspace.scopeNodes.length !== workspace.nodes.length) {
    return true;
  }

  return workspace.scopeNodes.some((node, index) => node.id !== workspace.nodes[index]?.id);
}

const SCOPED_CONTEXT_SEPARATOR = "::context::";

function parseScopedNodeId(nodeId: string) {
  const separatorIndex = nodeId.indexOf(SCOPED_CONTEXT_SEPARATOR);

  if (separatorIndex === -1) {
    return null;
  }

  return {
    originalNodeId: nodeId.slice(0, separatorIndex),
    focusedBlockId: nodeId.slice(separatorIndex + SCOPED_CONTEXT_SEPARATOR.length),
  };
}

function buildFocusedWorkspaceDetails(nodes: ReturnType<typeof getScopedWorkspaceNodes>) {
  if (nodes.length !== 1) {
    return null;
  }

  const node = nodes[0];

  if (!node || node.tabs.length !== 1) {
    return null;
  }

  const tab = node.tabs[0];

  if (!tab || tab.blocks.length !== 1) {
    return null;
  }

  const block = tab.blocks[0];

  if (!block) {
    return null;
  }

  const parsedScope = parseScopedNodeId(node.id);

  return [
    "Focused scope details:",
    `Node title: ${node.title}`,
    ...(node.label ? [`Node label: ${node.label}`] : []),
    ...(node.content ? [`Node context: ${node.content}`] : []),
    `Tab title: ${tab.title}`,
    `Block type: ${block.type}`,
    `Block title: ${block.title || "Untitled block"}`,
    `Block summary: ${summarizeBlock(block)}`,
    ...(parsedScope
      ? [
          `MUTATION TARGET IDs — use these when calling mutation tools:`,
          `  nodeId: ${parsedScope.originalNodeId}`,
          `  tabId: ${tab.id}`,
          `  blockId: ${parsedScope.focusedBlockId}`,
        ]
      : [
          `MUTATION TARGET IDs — use these when calling mutation tools:`,
          `  nodeId: ${node.id}`,
          `  tabId: ${tab.id}`,
          `  blockId: ${block.id}`,
        ]),
  ].join("\n");
}

function buildScopedWorkspaceContext(workspace: DashboardAgentWorkspaceContext) {
  const scopedNodes = getScopedWorkspaceNodes(workspace);

  if (!hasScopedWorkspace(workspace)) {
    return null;
  }

  if (scopedNodes.length === 1) {
    const node = scopedNodes[0];

    if (!node) {
      return null;
    }

    const parsedScope = parseScopedNodeId(node.id);
    const realNodeId = parsedScope?.originalNodeId ?? node.id;
    const activeTabId = workspace.activeTabId ?? node.viewState?.activeTabId;
    const activeTab = activeTabId ? node.tabs.find((tab) => tab.id === activeTabId) : node.tabs[0];

    const lines = [
      `CURRENT SCOPE: You are inside node "${node.title}" (nodeId: ${realNodeId}).`,
      ...(activeTab
        ? [
            `Active tab: "${activeTab.title}" (tabId: ${activeTab.id}) with ${activeTab.blocks.length} block${activeTab.blocks.length === 1 ? "" : "s"}.`,
          ]
        : []),
    ];

    if (parsedScope) {
      const focusedBlock = activeTab?.blocks.find(
        (block) => block.id === parsedScope.focusedBlockId,
      );

      if (focusedBlock) {
        lines.push(
          `Focused block: "${focusedBlock.title || "Untitled"}" (blockId: ${focusedBlock.id}, type: ${focusedBlock.type}).`,
        );
      }
    }

    lines.push(
      `When the user says "here", "this tab", "this node", or "current block", resolve to these IDs.`,
      `Default all mutations (create_block, patch_block, etc.) to nodeId: ${realNodeId}${activeTab ? `, tabId: ${activeTab.id}` : ""} unless the user explicitly names a different target.`,
    );

    return lines.join("\n");
  }

  return [
    `CURRENT SCOPE: You are scoped to ${scopedNodes.length} nodes. Prioritize mutations within these nodes.`,
    `Use the node/tab/block IDs from the scoped overview when the user refers to "here" or "this".`,
  ].join("\n");
}

function buildAgencyInstructions(workspace: DashboardAgentWorkspaceContext) {
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const todayUtc = new Date().toISOString().slice(0, 10);
  const scopeLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips for this turn:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : ["No Agency scope chips are pinned for this turn."];

  return [
    "You are Orch's Agency assistant.",
    "Help the user understand tracked time, projects, members, and report totals.",
    "Ground every answer in real Agency tool results. Never invent hours, members, or billable/waste splits.",
    "Never narrate tool calls in prose. Use actual function calls.",
    "Be concise, concrete, and factual.",
    `Today's date (UTC) is ${todayUtc}. Use YYYY-MM-DD for from/to. For "this month", use month start through today.`,
    "Prefer get_agency_reports_summary for project/client breakdowns; get_agency_time_summary for per-member totals.",
    UI_PRESENT_SYSTEM_GUIDANCE,
    userLabel,
    workspace.teamId ? `Active team id: ${workspace.teamId}.` : "Active team id is unavailable.",
    ...scopeLines,
  ].join("\n");
}

function buildAgencyAskInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgencyInstructions(workspace),
    "Ask mode is read-only. Do not create, edit, or delete Agency data.",
    "Agency Ask requires tools: before answering any time/report/member/project question, call at least one Agency data tool.",
    "For visual comparisons, tables, rankings, or multi-item breakdowns: after the data tool, call ui_present with kind 'schema' (use stack/grid/stat/table/pillRow). Then reply with one short line only — do not repeat the numbers as a bullet list.",
    "If a requested breakdown is missing from tool output, say what the tool returned instead of inventing fields.",
  ].join("\n");
}

function buildAgencyPlanInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgencyInstructions(workspace),
    "Plan mode: research with read tools, then call draft_agency_plan with concrete steps. Do not claim changes were applied.",
    "After drafting, tell the user to Confirm the plan in the UI. Never invent ids — use tool results.",
    "You may ui_present a visual overview of the plan; do not call propose_agency_action in Plan mode.",
  ].join("\n");
}

function buildAgencyAgentModeInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgencyInstructions(workspace),
    "Agent mode: never write Agency data directly. Call propose_agency_action for each intended write.",
    "After each propose_agency_action, call ui_present with a clear before/after illustration, then tell the user to Approve or Reject.",
    "Never claim a write succeeded until the user Approves. Prefer one proposal at a time unless the user asks for a batch.",
  ].join("\n");
}

function buildAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  if (workspace.surface === "agency") {
    // Mode-specific Agency instructions are applied in resolveAgentExecutionConfig.
    return buildAgencyInstructions(workspace);
  }

  const scopedNodes = getScopedWorkspaceNodes(workspace);
  const scopedWorkspace = hasScopedWorkspace(workspace);
  const updatedLabel = workspace.updatedAt
    ? `Workspace updated at ${workspace.updatedAt}.`
    : "Workspace update time is unavailable.";
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const marketplaceCount = workspace.marketplaceItems?.length ?? 0;
  const focusedWorkspaceDetails = buildFocusedWorkspaceDetails(scopedNodes);
  const scopedContext = buildScopedWorkspaceContext(workspace);
  const scopeRefLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips for this turn:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : [];

  return [
    "You are Orch's dashboard agent.",
    "Help the user reason about the dashboard, prioritize work, and spot gaps.",
    "Ground every answer in the actual workspace data. If you need more detail, call a tool instead of guessing.",
    "Be concise, concrete, and action-oriented.",
    UI_PRESENT_SYSTEM_GUIDANCE,
    userLabel,
    updatedLabel,
    `The dashboard currently has ${workspace.nodes.length} nodes.`,
    ...(scopedWorkspace
      ? [
          `The current turn is scoped to ${scopedNodes.length} node${scopedNodes.length === 1 ? "" : "s"}. Prioritize those unless the user asks you to work elsewhere.`,
        ]
      : []),
    `The marketplace currently has ${marketplaceCount} items.`,
    ...scopeRefLines,
    scopedWorkspace ? "Scoped dashboard overview:" : "Dashboard overview:",
    buildWorkspaceOverview(scopedNodes),
    ...(scopedContext ? [scopedContext] : []),
    ...(focusedWorkspaceDetails ? [focusedWorkspaceDetails] : []),
  ].join("\n");
}

function buildToolEnabledAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [buildAgentInstructions(workspace)].join("\n");
}

function buildDirectAnswerInstructions(workspace: DashboardAgentWorkspaceContext, note?: string) {
  return [
    buildAgentInstructions(workspace),
    "Answer directly from the provided workspace context.",
    "Do not call tools in this pass.",
    "If the context is incomplete, say what is missing instead of returning an empty response.",
    ...(note ? [note] : []),
  ].join("\n");
}

function buildAskInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  if (workspace.surface === "agency") {
    return toolingUnavailable
      ? [
          buildAgencyInstructions(workspace),
          "The selected model cannot call tools in this pass, so say that Agency data inspection requires a tools-capable model instead of inventing numbers.",
        ].join("\n")
      : buildAgencyAskInstructions(workspace);
  }

  const scopedWorkspace = hasScopedWorkspace(workspace);

  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so answer directly from the provided context and say when deeper inspection would require a tools-capable model."
      : "Start from the provided workspace context. If you need inspection, prefer one compact list, search, or summary detail tool before answering.",
    "Ask mode is read-only. Do not create, rename, update, or delete nodes, tabs, or blocks.",
    "Avoid full raw node, tab, block, or marketplace payloads unless the answer is blocked.",
    "If you inspect a block, use get_block_details and rely on its summary instead of guessing field names.",
    ...(scopedWorkspace
      ? [
          "SCOPE WORKFLOW: The user is inside a specific node. Inspect the scoped node's data first before looking elsewhere. Use the provided nodeId and tabId to target your inspection tools.",
        ]
      : []),
  ].join("\n");
}

function buildAgentOnlyInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  const scopedWorkspace = hasScopedWorkspace(workspace);

  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so explain that deep inspection is limited and answer from the provided context only."
      : "Inspect the workspace before concluding. Start with list, search, or summary detail tools to verify specifics before you answer.",
    "When the user asks you to create, rename, update, or delete nodes, tabs, or blocks, use the workspace mutation tools instead of only describing the change.",
    "Escalate to full raw node, tab, block, or marketplace payloads only when mutation prep or exact structural verification requires it.",
    'For block edits, search or inspect first, call get_block_details, use its editGuide with patch_block when possible, and only escalate to detailLevel: "full" plus replace_block when patch_block is not enough.',
    "If tools are available and the workspace has nodes, do at least one inspection step before your final answer.",
    ...(scopedWorkspace
      ? [
          "",
          "SCOPED MUTATION WORKFLOW — follow these steps in order:",
          "1. IDENTIFY SCOPE: The user is inside a specific node. The CURRENT SCOPE section above provides the target nodeId, tabId, and optionally blockId. All mutations default to these IDs.",
          "2. READ BEFORE WRITE: Call get_block_details or get_tab_details on the scoped target to understand its current state before mutating.",
          "3. APPLY MUTATIONS TO SCOPE: Use the scoped nodeId and tabId for create_block, patch_block, create_tab, etc. Do NOT create a new node unless the user explicitly asks to create a new node.",
          '4. RESOLVE REFERENCES: When the user says "here", "this tab", "this node", "this block", or "current", always resolve to the scoped IDs provided above.',
          "",
          "ANTI-PATTERNS — never do these when scoped:",
          "- NEVER call create_node when the user asks to add a block or content. Use create_block with the scoped nodeId and tabId instead.",
          '- NEVER create a new tab when the user says "add a block to this tab". Use the active tabId from the scope.',
          "- NEVER guess node/tab/block IDs. Use the exact IDs provided in CURRENT SCOPE and MUTATION TARGET IDs.",
        ]
      : []),
  ].join("\n");
}

function normalizeMessages(messages: AgentModelInputMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === "string" ? message.content.trim() : message.content,
  }));
}

function resolveAgentExecutionConfig(
  workspace: DashboardAgentWorkspaceContext,
  toolPreset: DashboardAgentToolPreset,
  supportsTools: boolean,
) {
  const agencyFallback = buildDirectAnswerInstructions(
    workspace,
    "Tooling is unavailable for the selected model, so say you cannot load Agency time data instead of inventing hours.",
  );
  const canvasToolingFallback = buildDirectAnswerInstructions(
    workspace,
    "Tooling is unavailable for the selected model, so this answer is limited to the provided workspace context.",
  );

  if (workspace.surface === "agency") {
    switch (toolPreset) {
      case "agent":
        return {
          shouldUseTools: supportsTools,
          instructions: supportsTools
            ? buildAgencyAgentModeInstructions(workspace)
            : agencyFallback,
          fallbackInstructions: agencyFallback,
          maxSteps: 10,
          maxOutputTokens: 1_200,
          shouldRetryForInspection: supportsTools,
        };
      case "plan":
        return {
          shouldUseTools: supportsTools,
          instructions: supportsTools ? buildAgencyPlanInstructions(workspace) : agencyFallback,
          fallbackInstructions: agencyFallback,
          maxSteps: 8,
          maxOutputTokens: undefined,
          shouldRetryForInspection: supportsTools,
        };
      case "ask":
        return {
          shouldUseTools: supportsTools,
          instructions: supportsTools ? buildAgencyAskInstructions(workspace) : agencyFallback,
          fallbackInstructions: agencyFallback,
          maxSteps: 8,
          maxOutputTokens: undefined,
          shouldRetryForInspection: supportsTools,
        };
      default: {
        const _exhaustive: never = toolPreset;
        return _exhaustive;
      }
    }
  }

  switch (toolPreset) {
    case "agent":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? buildAgentOnlyInstructions(workspace)
          : buildDirectAnswerInstructions(
              workspace,
              "Deep inspection is limited because the selected model cannot call tools.",
            ),
        fallbackInstructions: buildDirectAnswerInstructions(
          workspace,
          "Deep inspection is limited because the selected model cannot call tools.",
        ),
        maxSteps: 10,
        maxOutputTokens: 1_200,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    case "plan":
      // Canvas Plan mode is out of scope — treat as Ask.
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools ? buildAskInstructions(workspace) : canvasToolingFallback,
        fallbackInstructions: canvasToolingFallback,
        maxSteps: 6,
        maxOutputTokens: undefined,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    case "ask":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools ? buildAskInstructions(workspace) : canvasToolingFallback,
        fallbackInstructions: canvasToolingFallback,
        maxSteps: 6,
        maxOutputTokens: undefined,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    default: {
      const _exhaustive: never = toolPreset;
      return _exhaustive;
    }
  }
}

type ToolPassArgs = {
  model: string;
  workspace: DashboardAgentWorkspaceContext;
  workspaceRuntime: DashboardAgentWorkspaceRuntime;
  toolPreset: DashboardAgentToolPreset;
  agencyRuntime?: DashboardAgentConfig["agencyRuntime"];
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  instructions: string;
  maxSteps: number;
  temperature?: number;
  maxOutputTokens?: number;
  contextLength: number | null;
  signal?: AbortSignal;
};

type ToolPassLiveEvent =
  | { type: "token"; delta: string }
  | { type: "tool"; tool: AgentToolCall }
  | { type: "artifact"; artifact: AiUiArtifact }
  | { type: "plan"; plan: AgencyDraftPlan }
  | {
      type: "proposal";
      proposal: {
        proposalId: string;
        status: "pending";
        label: string;
        action: unknown;
        before: unknown;
        after: unknown;
      };
    };

type ToolPassResult = {
  responseText: string;
  toolCalls: AgentToolCall[];
  artifacts: AiUiArtifact[];
  usage: DashboardConversationUsageLatest | null;
  stopped: boolean;
};

async function* streamToolEnabledPass(
  args: ToolPassArgs,
): AsyncGenerator<ToolPassLiveEvent, ToolPassResult> {
  const tools =
    args.workspace.surface === "agency" && args.agencyRuntime
      ? buildAgencyAgentTools(args.agencyRuntime, args.toolPreset)
      : buildDashboardAgentTools(
          args.workspaceRuntime,
          args.workspace.marketplaceItems ?? [],
          args.toolPreset === "agent" ? "agent" : "ask",
        );
  const calls = new Map<string, AgentToolCall>();
  const callOrder: string[] = [];
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    tools,
    stopWhen: [stepCountIs(args.maxSteps)],
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
  });

  const queue: ToolPassLiveEvent[] = [];
  let wake: (() => void) | null = null;
  let pumpsDone = false;
  let accumulated = "";
  let stopped = Boolean(args.signal?.aborted);

  const notify = () => {
    wake?.();
    wake = null;
  };
  const enqueue = (event: ToolPassLiveEvent) => {
    queue.push(event);
    notify();
  };

  const cancelOnAbort = () => {
    stopped = true;
    void result.cancel();
    notify();
  };
  args.signal?.addEventListener("abort", cancelOnAbort, { once: true });

  const textPump = (async () => {
    try {
      for await (const delta of result.getTextStream()) {
        if (args.signal?.aborted) {
          stopped = true;
          break;
        }
        if (!delta) continue;
        accumulated += delta;
        enqueue({ type: "token", delta });
      }
    } catch {
      // cancel / stream end surfaced via getResponse below
    }
  })();

  const artifacts: AiUiArtifact[] = [];

  const toolPump = (async () => {
    try {
      for await (const message of result.getNewMessagesStream()) {
        if (args.signal?.aborted) {
          stopped = true;
          break;
        }
        const tool = mergeToolCallFromStreamMessage(message, calls, callOrder);
        if (tool) {
          enqueue({ type: "tool", tool: { ...tool } });
          if (tool.status === "completed") {
            const artifact = artifactFromToolCall(tool);
            if (artifact) {
              artifacts.push(artifact);
              enqueue({ type: "artifact", artifact });
            }
            if (tool.name === "draft_agency_plan") {
              const plan = agencyDraftPlanSchema.safeParse(tool.output);
              if (plan.success) {
                enqueue({ type: "plan", plan: plan.data });
              }
            }
            if (tool.name === "propose_agency_action") {
              const proposal = agencyProposalSnapshotSchema.safeParse({
                ...(typeof tool.output === "object" && tool.output ? tool.output : {}),
                status: "pending",
              });
              if (proposal.success) {
                enqueue({
                  type: "proposal",
                  proposal: {
                    proposalId: proposal.data.proposalId,
                    status: "pending",
                    label: proposal.data.label ?? "Proposed change",
                    action: proposal.data.action,
                    before: proposal.data.before,
                    after: proposal.data.after,
                  },
                });
              }
            }
          }
        }
      }
    } catch {
      // streaming errors are surfaced by getResponse rejection below
    }
  })();

  const pumps = Promise.all([textPump, toolPump]).finally(() => {
    pumpsDone = true;
    notify();
  });

  while (!pumpsDone || queue.length > 0) {
    if (queue.length === 0) {
      if (pumpsDone) break;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
      continue;
    }
    yield queue.shift()!;
  }

  await pumps;

  let usage: DashboardConversationUsageLatest | null = null;
  try {
    const [responseText, response] = await Promise.all([result.getText(), result.getResponse()]);
    accumulated = responseText || accumulated;
    usage = normalizeUsage(response.usage, args.model, args.contextLength);
  } catch {
    // cancelled mid-stream: keep accumulated tokens
  } finally {
    args.signal?.removeEventListener("abort", cancelOnAbort);
  }

  return {
    responseText: accumulated.trim(),
    toolCalls: orderedToolCalls(callOrder, calls),
    artifacts: cappedArtifacts(artifacts),
    usage,
    stopped: stopped || Boolean(args.signal?.aborted),
  };
}

async function* streamTextOnlyPass(args: {
  model: string;
  instructions: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  temperature?: number;
  maxOutputTokens?: number;
  contextLength: number | null;
  signal?: AbortSignal;
}): AsyncGenerator<ToolPassLiveEvent, ToolPassResult> {
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
  });

  let accumulated = "";
  let stopped = Boolean(args.signal?.aborted);
  const cancelOnAbort = () => {
    stopped = true;
    void result.cancel();
  };
  args.signal?.addEventListener("abort", cancelOnAbort, { once: true });

  try {
    for await (const delta of result.getTextStream()) {
      if (args.signal?.aborted) {
        stopped = true;
        break;
      }
      if (!delta) continue;
      accumulated += delta;
      yield { type: "token", delta };
    }
  } catch {
    // cancelled
  }

  let usage: DashboardConversationUsageLatest | null = null;
  try {
    const [responseText, response] = await Promise.all([result.getText(), result.getResponse()]);
    accumulated = responseText || accumulated;
    usage = normalizeUsage(response.usage, args.model, args.contextLength);
  } catch {
    // keep accumulated
  } finally {
    args.signal?.removeEventListener("abort", cancelOnAbort);
  }

  return {
    responseText: accumulated.trim(),
    toolCalls: [],
    artifacts: [],
    usage,
    stopped: stopped || Boolean(args.signal?.aborted),
  };
}

function normalizeUsage(
  usage: OpenRouterUsage | null | undefined,
  modelId: string,
  contextLength: number | null,
): DashboardConversationUsageLatest | null {
  if (!usage) {
    return null;
  }

  return {
    modelId,
    contextLength,
    inputTokens: usage.inputTokens,
    cachedTokens: usage.inputTokensDetails?.cachedTokens ?? 0,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.outputTokensDetails?.reasoningTokens ?? 0,
    totalTokens: usage.totalTokens,
    costUsd: usage.cost ?? null,
  };
}

export async function runDashboardAgent(
  messages: AgentModelInputMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig = {},
): Promise<AgentChatResponse> {
  let done: Extract<DashboardAgentStreamEvent, { type: "done" }> | null = null;
  for await (const event of streamDashboardAgent(messages, workspace, config)) {
    if (event.type === "done") {
      done = event;
    }
  }
  if (!done) {
    return {
      response: "I couldn't generate a response.",
      messagesCount: messages.length + 1,
      model: config.model?.trim() || DEFAULT_AGENT_MODEL,
      toolsCalled: [],
      workspaceNodeCount: workspace.nodes.length,
      usage: null,
      workspaceSnapshot: null,
    };
  }
  return {
    response: done.responseText || "I couldn't generate a response.",
    messagesCount: messages.length + 1,
    model: done.model,
    toolsCalled: done.toolCalls,
    workspaceNodeCount: done.workspaceNodeCount,
    usage: done.usage,
    workspaceSnapshot: done.workspaceSnapshot,
  };
}

export async function* streamDashboardAgent(
  messages: AgentModelInputMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig & { signal?: AbortSignal } = {},
): AsyncGenerator<DashboardAgentStreamEvent, void, void> {
  const toolCalls: AgentToolCall[] = [];
  const normalizedMessages = normalizeMessages(messages);
  const workspaceRuntime = createDashboardAgentWorkspaceRuntime({
    nodes: workspace.nodes,
    updatedAt: workspace.updatedAt,
  });
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;
  const surface = workspace.surface ?? "canvas";
  const toolPreset = config.toolPreset ?? "ask";
  const supportsTools = selectedModel?.supportsTools ?? true;
  const executionConfig = resolveAgentExecutionConfig(
    { ...workspace, surface },
    toolPreset,
    supportsTools,
  );
  let usage: DashboardConversationUsageLatest | null = null;
  let responseText = "";
  let stopped = Boolean(config.signal?.aborted);
  const artifacts: AiUiArtifact[] = [];

  if (executionConfig.shouldUseTools && !stopped) {
    try {
      const initialIterator = streamToolEnabledPass({
        model,
        workspace: { ...workspace, surface },
        workspaceRuntime,
        toolPreset,
        agencyRuntime: config.agencyRuntime,
        normalizedMessages,
        instructions: executionConfig.instructions,
        maxSteps: executionConfig.maxSteps,
        temperature: config.temperature,
        maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
        contextLength: selectedModel?.contextLength ?? null,
        signal: config.signal,
      });
      let initialNext = await initialIterator.next();
      while (!initialNext.done) {
        yield initialNext.value;
        initialNext = await initialIterator.next();
      }
      responseText = initialNext.value.responseText;
      usage = initialNext.value.usage;
      stopped = stopped || initialNext.value.stopped;
      toolCalls.push(...initialNext.value.toolCalls);
      artifacts.push(...initialNext.value.artifacts);

      if (!stopped && executionConfig.shouldRetryForInspection && toolCalls.length === 0) {
        const retryNote =
          surface === "agency"
            ? "You answered without calling Agency tools. Call get_agency_reports_summary or get_agency_time_summary with {from,to} for this month, then ui_present a schema canvas. Do not invent hours or narrate tool calls."
            : workspace.nodes.length > 0
              ? "You have not inspected the workspace yet. Call a relevant tool before answering."
              : null;
        if (retryNote) {
          const retryIterator = streamToolEnabledPass({
            model,
            workspace: { ...workspace, surface },
            workspaceRuntime,
            toolPreset,
            agencyRuntime: config.agencyRuntime,
            normalizedMessages,
            instructions: `${executionConfig.instructions}\n${retryNote}`,
            maxSteps: executionConfig.maxSteps,
            temperature: config.temperature,
            maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
            contextLength: selectedModel?.contextLength ?? null,
            signal: config.signal,
          });
          let retryNext = await retryIterator.next();
          while (!retryNext.done) {
            yield retryNext.value;
            retryNext = await retryIterator.next();
          }
          if (retryNext.value.responseText) {
            responseText = retryNext.value.responseText;
          }
          if (retryNext.value.usage) {
            usage = retryNext.value.usage;
          }
          stopped = stopped || retryNext.value.stopped;
          toolCalls.push(...retryNext.value.toolCalls);
          artifacts.push(...retryNext.value.artifacts);
        }
      }

      // Mixtral and similar models often advertise tools but never call them on Agency.
      // Fall back to a deterministic reports → canvas bootstrap so the operator still gets UI.
      if (
        !stopped &&
        surface === "agency" &&
        config.agencyRuntime &&
        artifacts.length === 0 &&
        !toolCalls.some((tool) => tool.name.startsWith("get_agency_"))
      ) {
        const boot = await bootstrapAgencyMonthReportsCanvas(config.agencyRuntime);
        toolCalls.push(boot.tool);
        yield { type: "tool", tool: { ...boot.tool, status: "in_progress" } };
        yield { type: "tool", tool: boot.tool };
        artifacts.push(boot.artifact);
        yield { type: "artifact", artifact: boot.artifact };
        if (!responseText.trim()) {
          responseText = boot.responseText;
        }
      }
    } catch {
      responseText = "";
      toolCalls.length = 0;
      artifacts.length = 0;
    }
  }

  let finalResponse = responseText.trim();

  if (!finalResponse && !stopped) {
    const toolsWereCalled = toolCalls.length > 0;
    const runtimeHasChanges = workspaceRuntime.hasChanges();
    const fallbackMaxOutputTokens = executionConfig.maxOutputTokens ?? config.maxOutputTokens;

    const fallbackInstructions = toolsWereCalled
      ? [
          buildAgentInstructions(workspace),
          runtimeHasChanges
            ? "You already called tools and applied mutations to the workspace. Summarize the completed actions for the user. Do not say that tools are unavailable — you already used them successfully."
            : "You called tools but the mutations did not complete. Explain what you attempted and what went wrong. Do not say that tools are unavailable — you did call tools but encountered errors.",
        ].join("\n")
      : executionConfig.fallbackInstructions;

    const fallbackIterator = streamTextOnlyPass({
      model,
      instructions: fallbackInstructions,
      normalizedMessages,
      temperature: config.temperature,
      maxOutputTokens: fallbackMaxOutputTokens,
      contextLength: selectedModel?.contextLength ?? null,
      signal: config.signal,
    });
    let fallbackNext = await fallbackIterator.next();
    while (!fallbackNext.done) {
      yield fallbackNext.value;
      fallbackNext = await fallbackIterator.next();
    }
    finalResponse = fallbackNext.value.responseText;
    usage = fallbackNext.value.usage;
    stopped = stopped || fallbackNext.value.stopped;
  }

  yield {
    type: "done",
    responseText: finalResponse || (stopped ? "" : "I couldn't generate a response."),
    toolCalls,
    artifacts: cappedArtifacts(artifacts),
    usage,
    model,
    workspaceNodeCount: workspaceRuntime.getNodes().length,
    workspaceSnapshot: workspaceRuntime.hasChanges() ? workspaceRuntime.toSnapshot() : null,
  };
}

export async function runTaskAgent(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  context: {
    taskTitle: string;
    taskStatus: string;
    projectName: string;
    clientName: string;
    assigneeName: string | null;
    recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  },
  config: {
    model?: string;
    maxOutputTokens?: number;
  } = {},
) {
  const client = createOpenRouterClient();
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;

  const instructions = [
    "You are Orch's agency task assistant.",
    "Answer questions about the task using only the task context and recent messages provided.",
    "You are read-only in this version: do not edit task status, assignee, or due date.",
    "Be concise and concrete.",
    "",
    "Task context:",
    `- Title: ${context.taskTitle}`,
    `- Status: ${context.taskStatus}`,
    `- Project: ${context.projectName}`,
    `- Client: ${context.clientName}`,
    context.assigneeName ? `- Assignee: ${context.assigneeName}` : "- Assignee: unassigned",
    "",
    "Recent messages in this thread:",
    ...context.recentMessages.map((m) => `${m.role}: ${m.content}`),
  ].join("\n");

  const normalizedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));

  const result = client.callModel({
    model,
    instructions,
    input: normalizedMessages,
    ...(config.maxOutputTokens === undefined ? {} : { maxOutputTokens: config.maxOutputTokens }),
  });

  const [text, response] = await Promise.all([result.getText(), result.getResponse()]);

  return {
    response: text.trim() || "I couldn't generate a response.",
    model,
    usage: normalizeUsage(response.usage, model, selectedModel?.contextLength ?? null),
  };
}

export * from "./agency-actions";
export * from "./attachment-content";
export * from "./models";
export * from "./model-routing";
export * from "./stream-turn";
export * from "./types";
export { listAgentToolCatalog } from "./tool-catalog";
