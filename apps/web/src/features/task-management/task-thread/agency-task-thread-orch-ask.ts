import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";
import type { AgentScopeRef } from "@orch/agent/types";

import { streamAgentChatTurn } from "@/features/workspace-agent/agent-turn-stream";
import {
  buildThreadOrchAskPrompt,
  ORCH_THREAD_AGENT_NAME,
  ORCH_THREAD_AGENT_USER_ID,
  taskMessageScopeLabel,
} from "@/features/task-management/task-thread/agency-task-thread-message-actions";

export async function runAgencyTaskThreadOrchAsk(args: {
  teamId: string;
  taskId: string;
  taskTitle: string;
  userContent: string;
  replyTo: AgencyTaskMessage | null;
  signal: AbortSignal;
  onAgentMessage: (message: AgencyTaskMessage) => void;
}) {
  const agentId = `orch-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const loading: AgencyTaskMessage = {
    id: agentId,
    teamId: args.teamId,
    taskId: args.taskId,
    userId: ORCH_THREAD_AGENT_USER_ID,
    userName: ORCH_THREAD_AGENT_NAME,
    userAvatar: null,
    content: "",
    createdAt,
    attachments: [],
    authorKind: "agent",
    streaming: true,
    pending: true,
  };
  args.onAgentMessage(loading);

  const scopeRefs: AgentScopeRef[] = [
    {
      kind: "task",
      id: args.taskId,
      label: args.taskTitle.slice(0, 160) || "Task",
    },
  ];
  if (args.replyTo) {
    scopeRefs.push({
      kind: "taskMessage",
      id: args.replyTo.id,
      label: taskMessageScopeLabel(args.replyTo),
    });
  }

  let text = "";
  try {
    await streamAgentChatTurn(
      {
        content: buildThreadOrchAskPrompt({
          taskTitle: args.taskTitle,
          userContent: args.userContent,
          replyTo: args.replyTo,
        }),
        attachments: [],
        surface: "agency",
        teamId: args.teamId,
        toolPreset: "ask",
        scopeRefs,
      },
      {
        signal: args.signal,
        onEvent: (event) => {
          if (event.type === "token") {
            text += event.delta;
            args.onAgentMessage({
              ...loading,
              content: text,
              pending: true,
              streaming: true,
            });
            return;
          }
          if (event.type === "error") {
            text = event.message?.trim() || "Orch couldn't answer.";
            args.onAgentMessage({
              ...loading,
              content: text,
              pending: false,
              streaming: false,
            });
            return;
          }
          if (event.type === "completed") {
            args.onAgentMessage({
              ...loading,
              content: text.trim() || "Done.",
              pending: false,
              streaming: false,
            });
          }
        },
      },
    );
  } catch (error) {
    if (args.signal.aborted) return;
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Orch couldn't answer.";
    args.onAgentMessage({
      ...loading,
      content: message,
      pending: false,
      streaming: false,
    });
  }
}
