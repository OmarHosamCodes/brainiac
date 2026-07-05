import type { ReactNode } from "react";

import { agencyMetricClass } from "@/lib/utils/agency-ui";
import {
  groupEntriesByClient,
  isReportEntryWaste,
  reportEntryWasteRowClass,
  type AgencyReportEntry,
  type ClientGroup,
} from "@/lib/utils/agency-report-grouping";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

type AgencyReportsTableProps = {
  entries: AgencyReportEntry[];
  clientGroups?: ClientGroup[];
  footer?: ReactNode;
};

export function AgencyReportsTable({
  entries,
  clientGroups: clientGroupsProp,
  footer,
}: AgencyReportsTableProps) {
  const clientGroups = clientGroupsProp ?? groupEntriesByClient(entries);
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);

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
            <table className="w-full min-w-[40rem] text-xs">
              <caption className="sr-only">
                Time entries for {clientGroup.clientName}, grouped by project
              </caption>
              <thead className="border-b border-default bg-muted/55">
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  <th scope="col" className="w-48 px-4 py-2.5 font-bold">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-bold">
                    Description
                  </th>
                  <th scope="col" className="w-28 px-4 py-2.5 text-right font-bold">
                    Duration
                  </th>
                  <th scope="col" className="w-36 px-4 py-2.5 font-bold">
                    Assignee
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientGroup.projects.flatMap((project) =>
                  project.rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-default last:border-b-0",
                        isReportEntryWaste(row) && reportEntryWasteRowClass,
                      )}
                    >
                      {rowIndex === 0 ? (
                        <td
                          rowSpan={project.rows.length}
                          className="border-r border-default bg-elevated/40 px-4 py-3 align-middle text-xs font-bold text-highlighted"
                        >
                          {project.projectName}
                        </td>
                      ) : null}
                      <td
                        className="max-w-md truncate px-4 py-3 text-highlighted"
                        title={row.description || undefined}
                        dir="auto"
                      >
                        {row.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                        {formatDuration(row.durationSeconds, "clock")}
                      </td>
                      <td className="px-4 py-3 text-highlighted">{row.userName}</td>
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
