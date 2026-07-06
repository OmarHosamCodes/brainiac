import type { ReactNode } from "react";

import { AgencyReportDurationCell } from "@/components/agency/agency-report-duration-cell";
import { agencyMetricClass } from "@/lib/utils/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  isReportFieldVisible,
  type AgencyReportFieldId,
} from "@/lib/agency/reports/agency-report-fields";
import {
  groupEntriesForDisplay,
  isReportEntryWaste,
  reportEntryWasteRowClass,
  type AgencyReportEntry,
  type DisplayClientGroup,
} from "@/lib/utils/agency-report-grouping";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

type AgencyReportsTableProps = {
  entries: AgencyReportEntry[];
  clientGroups?: DisplayClientGroup[];
  visibleFields?: AgencyReportFieldId[];
  footer?: ReactNode;
};

export function AgencyReportsTable({
  entries,
  clientGroups: clientGroupsProp,
  visibleFields = allAgencyReportFieldIds(),
  footer,
}: AgencyReportsTableProps) {
  const clientGroups = clientGroupsProp ?? groupEntriesForDisplay(entries);
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  const showProject = isReportFieldVisible(visibleFields, "project");
  const showTask = isReportFieldVisible(visibleFields, "task");
  const showDescription = isReportFieldVisible(visibleFields, "description");
  const showDuration = isReportFieldVisible(visibleFields, "duration");
  const showAssignee = isReportFieldVisible(visibleFields, "assignee");

  return (
    <div className="space-y-6">
      {clientGroups.map((clientGroup) => (
        <section key={clientGroup.clientId} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h3 className="text-sm font-bold text-highlighted">{clientGroup.clientName}</h3>
            <p className="text-xs text-muted">
              <span className={agencyMetricClass}>
                {formatDuration(clientGroup.totalSeconds, "clock")}
              </span>
              {" total"}
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-default bg-default">
            <table className="w-full min-w-[48rem] text-xs">
              <caption className="sr-only">
                Time entries for {clientGroup.clientName}, grouped by project and task
              </caption>
              <thead className="border-b border-default bg-muted/55">
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  {showProject ? (
                    <th scope="col" className="w-40 px-4 py-2.5 font-bold">
                      {AGENCY_REPORT_FIELD_LABELS.project}
                    </th>
                  ) : null}
                  {showTask ? (
                    <th scope="col" className="w-40 px-4 py-2.5 font-bold">
                      {AGENCY_REPORT_FIELD_LABELS.task}
                    </th>
                  ) : null}
                  {showDescription ? (
                    <th scope="col" className="px-4 py-2.5 font-bold">
                      {AGENCY_REPORT_FIELD_LABELS.description}
                    </th>
                  ) : null}
                  {showDuration ? (
                    <th scope="col" className="w-28 px-4 py-2.5 text-right font-bold">
                      {AGENCY_REPORT_FIELD_LABELS.duration}
                    </th>
                  ) : null}
                  {showAssignee ? (
                    <th scope="col" className="w-36 px-4 py-2.5 font-bold">
                      {AGENCY_REPORT_FIELD_LABELS.assignee}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {clientGroup.projects.flatMap((project) =>
                  project.rows.map((row, rowIndex) => (
                    <tr
                      key={row.key}
                      className={cn(
                        "border-b border-default last:border-b-0",
                        isReportEntryWaste(row) && reportEntryWasteRowClass,
                      )}
                    >
                      {showProject && rowIndex === 0 ? (
                        <td
                          rowSpan={project.rows.length}
                          className="border-r border-default bg-elevated/40 px-4 py-3 align-middle text-xs font-bold text-highlighted"
                        >
                          {project.projectName}
                        </td>
                      ) : null}
                      {showTask ? (
                        <td
                          className="max-w-48 truncate px-4 py-3 text-highlighted"
                          title={row.taskTitle || undefined}
                          dir="auto"
                        >
                          {row.taskTitle || "—"}
                        </td>
                      ) : null}
                      {showDescription ? (
                        <td
                          className="max-w-md truncate px-4 py-3 text-highlighted"
                          title={row.description || undefined}
                          dir="auto"
                        >
                          {row.description || "—"}
                        </td>
                      ) : null}
                      {showDuration ? (
                        <td className="px-4 py-3 text-right text-muted">
                          <AgencyReportDurationCell row={row} />
                        </td>
                      ) : null}
                      {showAssignee ? (
                        <td className="px-4 py-3 text-highlighted">{row.userName}</td>
                      ) : null}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {footer ?? (
        <p className="text-xs text-muted">
          <span className={agencyMetricClass}>{entries.length}</span>
          {entries.length === 1 ? " entry" : " entries"}
          <span aria-hidden="true"> · </span>
          <span className={agencyMetricClass}>{formatDuration(totalSeconds, "clock")}</span>
          {" total"}
        </p>
      )}
    </div>
  );
}
