export type WorkspaceAgentMessageSearchHit = {
  id: string;
  before: string;
  match: string;
  after: string;
  position: number;
};

const CONTEXT = 24;

export function findWorkspaceAgentMessageHits(haystack: string, query: string): WorkspaceAgentMessageSearchHit[] {
  const needle = query.trim();
  if (!needle) return [];
  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const hits: WorkspaceAgentMessageSearchHit[] = [];
  let from = 0;
  while (from < haystack.length) {
    const position = lowerHay.indexOf(lowerNeedle, from);
    if (position === -1) break;
    hits.push({
      id: `hit-${position}`,
      before: haystack.slice(Math.max(0, position - CONTEXT), position),
      match: haystack.slice(position, position + needle.length),
      after: haystack.slice(position + needle.length, position + needle.length + CONTEXT),
      position,
    });
    from = position + Math.max(needle.length, 1);
  }
  return hits;
}

export function joinOrchMessageText(messages: Array<{ parts?: Array<{ type: string; text?: string }> }>) {
  return messages
    .flatMap((message) => message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n");
}
