import { DASHBOARD_CONVERSATION_TITLE_LIMIT } from "@brainiac/agent";

export function buildDashboardConversationTitle(content: string) {
  return content.trim().slice(0, DASHBOARD_CONVERSATION_TITLE_LIMIT) || "New conversation";
}

export function normalizeDashboardConversationTitle(title: string) {
  return title.trim().slice(0, DASHBOARD_CONVERSATION_TITLE_LIMIT);
}

export function buildDashboardMessagePreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 280) : null;
}

export function buildDashboardConversationDeletionResult(conversationId: string) {
  return { deleted: true as const, conversationId };
}
