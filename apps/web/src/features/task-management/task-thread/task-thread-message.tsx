import { TaskThreadAgentMessage } from "@/features/task-management/task-thread/task-thread-agent-message";
import { TaskThreadMessageBody } from "@/features/task-management/task-thread/task-thread-user-message";
import { TaskThreadUserMessage } from "@/features/task-management/task-thread/task-thread-user-message";
import type { TaskThreadMessageViewModel } from "@/features/task-management/hooks/use-task-thread-messaging";

type TaskThreadMessageProps = {
  message: TaskThreadMessageViewModel;
};

function TaskThreadDateDivider({ label }: { label: string }) {
  return (
    <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted">
      {label}
    </div>
  );
}

export function TaskThreadMessage({ message }: TaskThreadMessageProps) {
  return (
    <div>
      {message.showDateDivider ? <TaskThreadDateDivider label={message.dateLabel} /> : null}

      {message.senderType === "system" ? (
        <div className="flex justify-center py-1">
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted">
            {message.content ?? "System message"}
          </span>
        </div>
      ) : null}

      {message.senderType === "agent" ? (
        <div className={message.isOptimistic ? "opacity-70" : undefined}>
          <TaskThreadAgentMessage
            content={message.content}
            createdAt={message.createdAt}
            isPending={message.isAgentPending}
          />
          {message.attachments.length > 0 ? (
            <div className="mt-2 pl-9">
              <TaskThreadMessageBody
                attachments={message.attachments}
                messageType={message.type}
                content={null}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {message.senderType === "user" ? (
        <TaskThreadUserMessage
          userName={message.userName}
          userAvatar={message.userAvatar}
          createdAt={message.createdAt}
          attachments={message.attachments}
          messageType={message.type}
          content={message.content}
          isOptimistic={message.isOptimistic}
        />
      ) : null}
    </div>
  );
}
