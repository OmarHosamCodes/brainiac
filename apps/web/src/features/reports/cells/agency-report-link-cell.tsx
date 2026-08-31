import {
  collectTimeEntryLinkRecords,
  formatTimeEntryLinkLabel,
  joinedTimeEntryLinkUrls,
  type TimeEntryLinkRecord,
} from "@/features/time-tracking/time-entry-links";
import { AgencyTimeEntryLinkHoverTrigger } from "@/features/time-tracking/agency-time-entry-link-hover-trigger";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

const reportCellHitClass =
  "-mx-4 -my-3 flex w-[calc(100%+2rem)] min-h-10 items-center gap-1.5 px-4 py-3 text-start";

type AgencyReportLinkCellProps = {
  links: readonly TimeEntryLinkRecord[];
  disabled?: boolean;
  onSave: (urls: string[]) => void | Promise<void>;
};

export function AgencyReportLinkCell({
  links,
  disabled = false,
  onSave,
}: AgencyReportLinkCellProps) {
  const joined = joinedTimeEntryLinkUrls([{ links }]);
  const unique = collectTimeEntryLinkRecords([{ links }]);

  return (
    <div className={cn(reportCellHitClass, "group/row")}>
      <div className="min-w-0 flex-1 truncate text-start text-xs" title={joined || undefined}>
        {unique.length > 0 ? (
          unique.map((link, index) => (
            <span key={link.id}>
              {index > 0 ? <span className="text-muted"> · </span> : null}
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "text-highlighted underline-offset-2 hover:underline",
                  agencyFocusRingClass,
                )}
                onClick={(event) => event.stopPropagation()}
              >
                {formatTimeEntryLinkLabel(link.url)}
              </a>
            </span>
          ))
        ) : (
          <span className="text-muted">—</span>
        )}
      </div>
      <AgencyTimeEntryLinkHoverTrigger
        links={unique}
        disabled={disabled}
        hoverRevealClassName="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
        onSave={onSave}
      />
    </div>
  );
}
