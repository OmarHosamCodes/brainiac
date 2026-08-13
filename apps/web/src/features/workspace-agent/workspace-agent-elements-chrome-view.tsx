import { AgentStatus } from "@/components/elements/agent-status";
import { CodeRunner } from "@/components/elements/code-runner";
import { ConnectionState } from "@/components/elements/connection-state";
import { ErrorState } from "@/components/elements/error-state";
import { McpServerPanel } from "@/components/elements/mcp-server-panel";
import { QuotaBanner } from "@/components/elements/quota-banner";
import { StoppedRun } from "@/components/elements/stopped-run";
import { ThinkingIndicator } from "@/components/elements/thinking-indicator";
import { VoiceConversation } from "@/components/elements/voice-conversation";
import { cn } from "@/lib/utils";

export type WorkspaceAgentQuotaBanner = {
  used: number;
  limit: number;
  unit: string;
  resetsIn: string;
  upgradeLabel: string;
};

type WorkspaceAgentElementsChromeViewProps = {
  isStreaming: boolean;
  streamStopped: boolean;
  error: string | null;
  onRetry: () => void;
  onContinue: () => void;
  lastAssistantWords: string[];
  quota: WorkspaceAgentQuotaBanner | null;
};

export function WorkspaceAgentElementsChromeView({
  isStreaming,
  streamStopped,
  error,
  onRetry,
  onContinue,
  lastAssistantWords,
  quota,
}: WorkspaceAgentElementsChromeViewProps) {
  return (
    <div className={cn("flex flex-col gap-2 px-3 py-2")} data-assistant-ui-chrome>
      <div className="flex flex-wrap items-center gap-2">
        <AgentStatus
          state={isStreaming ? "working" : streamStopped ? "waiting" : "done"}
          label={isStreaming ? "Working" : streamStopped ? "Stopped" : "Ready"}
        />
        <ConnectionState phase={error ? "dropped" : "online"} onRetry={onRetry} />
        {isStreaming ? <ThinkingIndicator label="Thinking" /> : null}
      </div>
      {quota ? (
        <QuotaBanner
          used={quota.used}
          limit={quota.limit}
          unit={quota.unit}
          resetsIn={quota.resetsIn}
          upgradeLabel={quota.upgradeLabel}
        />
      ) : null}
      {error ? (
        <ErrorState title="Couldn't reach Orch" detail={error} retrying={false} onRetry={onRetry} />
      ) : null}
      {streamStopped ? (
        <StoppedRun
          words={lastAssistantWords.length > 0 ? lastAssistantWords : ["Stopped before a reply."]}
          reason="Stopped"
          onContinue={onContinue}
        />
      ) : null}
      <details className="rounded-xl border border-border bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          Voice, MCP, and runner (disconnected)
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <VoiceConversation mode="connecting" amplitude={0} transcript={[]} />
          <McpServerPanel servers={[]} />
          <CodeRunner
            language="ts"
            code="// No sandbox connected"
            state="idle"
            output={["Disconnected. Code sandbox is not available."]}
          />
        </div>
      </details>
    </div>
  );
}
