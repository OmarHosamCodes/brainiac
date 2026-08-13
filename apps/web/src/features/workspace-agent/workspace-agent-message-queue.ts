export const MAX_QUEUED_AGENT_MESSAGES = 5;

export type QueuedAgentMessage = {
  id: string;
  text: string;
};

export function canEnqueueAgentMessage(input: { isStreaming: boolean; queueLength: number }) {
  return input.isStreaming && input.queueLength < MAX_QUEUED_AGENT_MESSAGES;
}

export function enqueueAgentMessage(
  queue: readonly QueuedAgentMessage[],
  input: { text: string },
): QueuedAgentMessage[] {
  const text = input.text.trim();
  if (!text) return [...queue];
  if (queue.length >= MAX_QUEUED_AGENT_MESSAGES) return [...queue];
  return [...queue, { id: crypto.randomUUID(), text }];
}

export function cancelQueuedAgentMessage(
  queue: readonly QueuedAgentMessage[],
  id: string,
): QueuedAgentMessage[] {
  return queue.filter((entry) => entry.id !== id);
}

export function dequeueAgentMessage(queue: readonly QueuedAgentMessage[]): {
  next: QueuedAgentMessage | null;
  rest: QueuedAgentMessage[];
} {
  const [next, ...rest] = queue;
  return { next: next ?? null, rest };
}
