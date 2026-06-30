import { renderSimpleMarkdown } from "@/lib/utils/render-simple-markdown";
import { agencyAgentMessageCardClass, agencyAgentMessageCodeClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskAgentMessageViewProps = {
  content: string | null;
  createdAt: string;
};

type ContentSegment =
  | { type: "prose"; content: string }
  | { type: "code"; content: string; language?: string };

function parseAgentContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const pattern = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const prose = content.slice(lastIndex, match.index).trim();
    if (prose) {
      segments.push({ type: "prose", content: prose });
    }
    segments.push({
      type: "code",
      language: match[1] || undefined,
      content: match[2]?.trim() ?? "",
    });
    lastIndex = match.index + match[0].length;
  }

  const trailing = content.slice(lastIndex).trim();
  if (trailing) {
    segments.push({ type: "prose", content: trailing });
  }

  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "prose", content: content.trim() });
  }

  return segments;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AgencyTaskAgentMessageView({ content, createdAt }: AgencyTaskAgentMessageViewProps) {
  const segments = content ? parseAgentContent(content) : [];

  return (
    <article className={agencyAgentMessageCardClass} aria-label="Agent message">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-xs font-bold text-highlighted">Agent</span>
        <time className="text-[11px] text-muted" dateTime={createdAt}>
          {formatTime(createdAt)}
        </time>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-muted">No response content.</p>
      ) : (
        <div className="space-y-2">
          {segments.map((segment, index) => {
            if (segment.type === "code") {
              return (
                <div key={`code-${index}`} className={agencyAgentMessageCodeClass}>
                  {segment.language ? (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {segment.language}
                    </p>
                  ) : null}
                  <pre className="whitespace-pre-wrap select-text">{segment.content}</pre>
                </div>
              );
            }

            return (
              <div
                key={`prose-${index}`}
                className={cn(
                  "prose prose-sm dark:prose-invert max-w-none select-text text-sm",
                )}
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(segment.content) }}
              />
            );
          })}
        </div>
      )}
    </article>
  );
}
