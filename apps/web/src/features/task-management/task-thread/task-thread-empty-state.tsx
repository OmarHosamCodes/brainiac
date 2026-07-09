type TaskThreadEmptyStateProps = {
  agentEnabled: boolean;
};

export function TaskThreadEmptyState({ agentEnabled }: TaskThreadEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-bold text-highlighted">Start the conversation</p>
      <p className="mt-1 max-w-xs text-xs text-muted">
        {agentEnabled
          ? "Ask the agent about this task, or send a message to the team."
          : "Send a message, attach files, or record a voice note."}
      </p>
    </div>
  );
}
