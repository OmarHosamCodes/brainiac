import type { WorkspaceNode } from "@orch/workspace";

export type DashboardAgentActiveMention = {
  query: string;
  start: number;
  end: number;
};

const ACTIVE_NODE_MENTION_PATTERN = /(^|[\s([{:;,])@([^\s@]*)$/;

function normalizeMentionQuery(value: string) {
  return value.trim().toLowerCase();
}

function scoreMentionSuggestion(node: WorkspaceNode, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 1;
  }

  const title = node.title.toLowerCase();
  const label = node.label?.toLowerCase() ?? "";
  const id = node.id.toLowerCase();

  if (title === normalizedQuery) {
    return 100;
  }

  if (id === normalizedQuery) {
    return 95;
  }

  if (label === normalizedQuery) {
    return 90;
  }

  if (title.startsWith(normalizedQuery)) {
    return 80;
  }

  if (label.startsWith(normalizedQuery)) {
    return 70;
  }

  if (id.startsWith(normalizedQuery)) {
    return 60;
  }

  if (title.includes(normalizedQuery)) {
    return 50;
  }

  if (label.includes(normalizedQuery)) {
    return 40;
  }

  if (id.includes(normalizedQuery)) {
    return 30;
  }

  return 0;
}

export function getActiveDashboardNodeMention(draft: string): DashboardAgentActiveMention | null {
  const match = ACTIVE_NODE_MENTION_PATTERN.exec(draft);

  if (!match) {
    return null;
  }

  const prefix = match[1] ?? "";
  const query = match[2] ?? "";
  const start = match.index + prefix.length;

  return {
    query,
    start,
    end: draft.length,
  };
}

export function getDashboardNodeMentionSuggestions(
  nodes: WorkspaceNode[],
  query: string,
  selectedNodeIds: Set<string>,
  limit = 6,
) {
  const normalizedQuery = normalizeMentionQuery(query);

  return nodes
    .filter((node) => !selectedNodeIds.has(node.id))
    .map((node) => ({
      node,
      score: scoreMentionSuggestion(node, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) => right.score - left.score || left.node.title.localeCompare(right.node.title),
    )
    .slice(0, limit)
    .map(({ node }) => node);
}

export function stripActiveDashboardNodeMention(draft: string) {
  const activeMention = getActiveDashboardNodeMention(draft);

  if (!activeMention) {
    return draft;
  }

  return `${draft.slice(0, activeMention.start)}${draft.slice(activeMention.end)}`;
}
