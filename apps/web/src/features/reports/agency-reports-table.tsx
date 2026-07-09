import type { ReactNode } from "react";

import { AgencyReportDescriptionCell } from "@/features/reports/cells/agency-report-description-cell";
import { AgencyReportDurationCell } from "@/features/reports/cells/agency-report-duration-cell";
import { AgencyReportRowActions } from "@/features/reports/agency-report-row-actions";
import { AgencyReportTaskCell } from "@/features/reports/cells/agency-report-task-cell";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  isReportFieldVisible,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import {
  groupEntriesForDisplay,
  isReportEntryWaste,
  reportEntryWasteRowClass,
  type AgencyReportEntry,
  type AggregatedReportRow,
  type DisplayClientGroup,
} from "@/features/reports/agency-report-grouping";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

type AgencyReportsTableProps = {
  entries: AgencyReportEntry[];
  clientGroups?: DisplayClientGroup[];
  visibleFields?: AgencyReportFieldId[];
  footer?: ReactNode;
  projects?: Array<Pick<AgencyProject, "id" | "clientName" | "name">>;
  tasks?: Array<
    Pick<
      AgencyProjectTask,
      "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
    > & {
      dueDate?: string | null;
    }
  >;
  tasksLoading?: boolean;
  updatingRowKeys?: ReadonlySet<string>;
  deletingEntryIds?: readonly string[];
  wastePendingRowKeys?: ReadonlySet<string>;
  onTaskChange?: (row: AggregatedReportRow, taskId: string) => void;
  onDescriptionChange?: (row: AggregatedReportRow, description: string) => void;
  onDeleteRow?: (row: AggregatedReportRow) => void;
  onToggleWaste?: (row: AggregatedReportRow) => void;
};

export function AgencyReportsTable({
  entries,
  clientGroups: clientGroupsProp,
  visibleFields = allAgencyReportFieldIds(),
  footer,
  projects = [],
  tasks = [],
  tasksLoading = false,
  updatingRowKeys,
  deletingEntryIds = [],
  wastePendingRowKeys,
  onTaskChange,
  onDescriptionChange,
  onDeleteRow,
  onToggleWaste,
}: AgencyReportsTableProps) {
  const clientGroups = clientGroupsProp ?? groupEntriesForDisplay(entries);
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  const showProject = isReportFieldVisible(visibleFields, "project");
  const showTask = isReportFieldVisible(visibleFields, "task");
  const showDescription = isReportFieldVisible(visibleFields, "description");
  const showDuration = isReportFieldVisible(visibleFields, "duration");
  const showAssignee = isReportFieldVisible(visibleFields, "assignee");
  const showActions = Boolean(onDeleteRow || onToggleWaste);
  const deletingEntryIdSet = new Set(deletingEntryIds);

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
                  {showActions ? (
                    <th scope="col" className="w-10 px-2 py-2.5">
                      <span className="sr-only">Actions</span>
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
                          className="border-r border-default bg-elevated/40 px-4 py-3 align-top text-xs"
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-highlighted">
                              {project.projectName}
                            </span>
                            {showDuration ? (
                              <span className={cn("text-[10px] text-muted", agencyMetricClass)}>
                                {formatDuration(project.totalSeconds, "clock")}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                      {showTask ? (
                        <td className="max-w-48 px-4 py-3 text-highlighted" dir="auto">
                          {onTaskChange ? (
                            <AgencyReportTaskCell
                              row={row}
                              projects={projects}
                              tasks={tasks}
                              loading={tasksLoading}
                              disabled={updatingRowKeys?.has(row.key)}
                              onTaskChange={(taskId) => onTaskChange(row, taskId)}
                            />
                          ) : (
                            <span className="block truncate" title={row.taskTitle || undefined}>
                              {row.taskTitle || "—"}
                            </span>
                          )}
                        </td>
                      ) : null}
                      {showDescription ? (
                        <td className="max-w-md px-4 py-3 text-highlighted" dir="auto">
                          {onDescriptionChange ? (
                            <AgencyReportDescriptionCell
                              value={row.description}
                              disabled={updatingRowKeys?.has(row.key)}
                              onSave={(description) => onDescriptionChange(row, description)}
                            />
                          ) : (
                            <span className="block truncate" title={row.description || undefined}>
                              {row.description || "—"}
                            </span>
                          )}
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
                      {showActions ? (
                        <td className="px-2 py-3 text-right">
                          <AgencyReportRowActions
                            label={row.taskTitle || row.description || row.projectName}
                            taskId={row.taskId}
                            taskIsWaste={row.taskIsWaste}
                            deleting={row.entries.some((entry) => deletingEntryIdSet.has(entry.id))}
                            wastePending={wastePendingRowKeys?.has(row.key)}
                            onDelete={() => onDeleteRow?.(row)}
                            onToggleWaste={
                              row.taskId && onToggleWaste ? () => onToggleWaste(row) : undefined
                            }
                          />
                        </td>
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
