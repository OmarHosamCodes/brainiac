import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart2, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AgencyDashboardCommandBar,
  type RangePreset,
} from "@/components/agency/agency-dashboard-command-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc, orpcClient } from "@/lib/orpc";
import { useAgencyClientsQuery } from "@/lib/queries/agency";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
} from "@/lib/tenure-utils";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyMetricClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyReportsSurfaceProps = {
  teamId: string;
};

type AgencyReportEntry = Awaited<
  ReturnType<typeof orpcClient.agencyOps.reports.listEntries>
>["items"][number];

type ProjectGroup = {
  projectId: string;
  projectName: string;
  rows: AgencyReportEntry[];
};

type ClientGroup = {
  clientId: string;
  clientName: string;
  projects: ProjectGroup[];
  totalSeconds: number;
};

type ReportEntryFilters = {
  clientId?: string;
  projectId?: string;
  memberUserId?: string;
};

const ENTRIES_PAGE_SIZE = 100;

function startOfWeekUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string, endOfDay = false): string {
  if (!value) return new Date().toISOString();
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

function sortRowsByStartedAt(rows: AgencyReportEntry[]): AgencyReportEntry[] {
  return [...rows].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
}

function groupEntriesByClient(entries: AgencyReportEntry[]): ClientGroup[] {
  const byClient = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      byProject: Map<string, ProjectGroup>;
      totalSeconds: number;
    }
  >();

  for (const entry of entries) {
    let client = byClient.get(entry.clientId);
    if (!client) {
      client = {
        clientId: entry.clientId,
        clientName: entry.clientName,
        byProject: new Map(),
        totalSeconds: 0,
      };
      byClient.set(entry.clientId, client);
    }

    client.totalSeconds += entry.durationSeconds;

    let project = client.byProject.get(entry.projectId);
    if (!project) {
      project = {
        projectId: entry.projectId,
        projectName: entry.projectName,
        rows: [],
      };
      client.byProject.set(entry.projectId, project);
    }
    project.rows.push(entry);
  }

  return [...byClient.values()]
    .sort((left, right) => left.clientName.localeCompare(right.clientName))
    .map((client) => ({
      clientId: client.clientId,
      clientName: client.clientName,
      totalSeconds: client.totalSeconds,
      projects: [...client.byProject.values()]
        .sort((left, right) => left.projectName.localeCompare(right.projectName))
        .map((project) => ({
          ...project,
          rows: sortRowsByStartedAt(project.rows),
        })),
    }));
}

// ponytail: sequential page fetches; upgrade path is a bulk reports.entries endpoint.
async function fetchAllReportEntries(
  teamId: string,
  range: { from: string; to: string },
  filters: ReportEntryFilters,
): Promise<AgencyReportEntry[]> {
  const items: AgencyReportEntry[] = [];
  let page = 1;

  while (true) {
    const result = await orpcClient.agencyOps.reports.listEntries({
      teamId,
      from: range.from,
      to: range.to,
      clientId: filters.clientId,
      projectId: filters.projectId,
      memberUserId: filters.memberUserId,
      page,
      pageSize: ENTRIES_PAGE_SIZE,
    });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length < ENTRIES_PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return items;
}

export function AgencyReportsSurface({ teamId }: AgencyReportsSurfaceProps) {
  const now = useMemo(() => new Date(), []);

  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;
  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );

  const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset | null>(null);
  const effectiveAppliedRangePreset = appliedRangePreset ?? defaultRangePreset;
  const [appliedCustomFromDate, setAppliedCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [appliedCustomToDate, setAppliedCustomToDate] = useState(toDateInputValue(now));
  const [appliedProjectId, setAppliedProjectId] = useState("");
  const [appliedMemberUserId, setAppliedMemberUserId] = useState("");
  const [appliedClientId, setAppliedClientId] = useState("");

  const [draftRangePreset, setDraftRangePreset] = useState<RangePreset | null>(null);
  const effectiveDraftRangePreset = draftRangePreset ?? defaultRangePreset;
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [draftCustomToDate, setDraftCustomToDate] = useState(toDateInputValue(now));
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftMemberUserId, setDraftMemberUserId] = useState("");
  const [draftClientId, setDraftClientId] = useState("");

  const hasPendingFilterChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    draftProjectId !== appliedProjectId ||
    draftMemberUserId !== appliedMemberUserId ||
    draftClientId !== appliedClientId ||
    (effectiveDraftRangePreset === "custom" &&
      (draftCustomFromDate !== appliedCustomFromDate ||
        draftCustomToDate !== appliedCustomToDate));

  const range = useMemo(() => {
    const endIso = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    ).toISOString();

    if (effectiveAppliedRangePreset === "tenure") {
      const tenureRange = getCurrentTenurePeriodRange(tenurePolicy, now);
      if (tenureRange) {
        return { from: tenureRange.from, to: tenureRange.to };
      }
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "month") {
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "last30") {
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "custom") {
      return {
        from: dateInputToIso(appliedCustomFromDate),
        to: dateInputToIso(appliedCustomToDate, true),
      };
    }
    return { from: startOfWeekUtc().toISOString(), to: endIso };
  }, [appliedCustomFromDate, appliedCustomToDate, effectiveAppliedRangePreset, now, tenurePolicy]);

  const appliedFilters = useMemo(
    () => ({
      clientId: appliedClientId || undefined,
      projectId: appliedProjectId || undefined,
      memberUserId: appliedMemberUserId || undefined,
    }),
    [appliedClientId, appliedMemberUserId, appliedProjectId],
  );

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const clientsQuery = useAgencyClientsQuery(teamId);
  const membersQuery = useQuery({
    ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      appliedClientId,
      appliedProjectId,
      appliedMemberUserId,
    ],
    queryFn: () => fetchAllReportEntries(teamId, range, appliedFilters),
    enabled: Boolean(teamId),
    placeholderData: keepPreviousData,
  });

  const entries = entriesQuery.data ?? [];
  const clientGroups = useMemo(() => groupEntriesByClient(entries), [entries]);
  const totalSeconds = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    [entries],
  );

  const exportCsvMutation = useMutation(orpc.agencyOps.reports.exportCsv.mutationOptions());

  const projects = projectsQuery.data?.items ?? [];
  const clients = (clientsQuery.data?.items ?? []).map((client) => ({
    id: client.id,
    name: client.name,
  }));
  const filteredProjects = useMemo(() => {
    if (!draftClientId) return projects;
    return projects.filter((project) => project.clientId === draftClientId);
  }, [draftClientId, projects]);
  const members = (membersQuery.data?.items ?? []).map((member) => ({
    userId: member.userId,
    userName: member.userName,
    avatar: member.userAvatar,
  }));

  function handleClientChange(clientId: string) {
    setDraftClientId(clientId);
    if (!clientId || !draftProjectId) return;
    const project = projects.find((entry) => entry.id === draftProjectId);
    if (project && project.clientId !== clientId) {
      setDraftProjectId("");
    }
  }

  function handleApply() {
    setAppliedRangePreset(draftRangePreset);
    setAppliedCustomFromDate(draftCustomFromDate);
    setAppliedCustomToDate(draftCustomToDate);
    setAppliedProjectId(draftProjectId);
    setAppliedMemberUserId(draftMemberUserId);
    setAppliedClientId(draftClientId);
  }

  function handleReset() {
    setDraftRangePreset(null);
    setDraftProjectId("");
    setDraftMemberUserId("");
    setDraftClientId("");
    setAppliedRangePreset(null);
    setAppliedProjectId("");
    setAppliedMemberUserId("");
    setAppliedClientId("");
  }

  async function downloadCsv() {
    if (!teamId) return;
    try {
      const result = await exportCsvMutation.mutateAsync({
        teamId,
        from: range.from,
        to: range.to,
        clientId: appliedFilters.clientId,
        projectId: appliedFilters.projectId,
        memberUserId: appliedFilters.memberUserId,
      });
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export ready", {
        description: `${result.totalRows} rows in ${result.fileName}`,
      });
    } catch (error) {
      toast.error("Export failed", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  const filtersLoading =
    tenurePolicyQuery.isPending || projectsQuery.isPending || clientsQuery.isPending;

  return (
    <div className="agency-reports space-y-4">
      {filtersLoading ? (
        <Skeleton className="h-[4.25rem] w-full rounded-2xl" />
      ) : (
        <AgencyDashboardCommandBar
          rangePreset={effectiveDraftRangePreset}
          onRangePresetChange={setDraftRangePreset}
          customFromDate={draftCustomFromDate}
          onCustomFromChange={setDraftCustomFromDate}
          customToDate={draftCustomToDate}
          onCustomToChange={setDraftCustomToDate}
          clientId={draftClientId}
          onClientChange={handleClientChange}
          clients={clients}
          clientsLoading={clientsQuery.isPending}
          projectId={draftProjectId}
          onProjectChange={setDraftProjectId}
          memberUserId={draftMemberUserId}
          onMemberChange={setDraftMemberUserId}
          onApply={handleApply}
          hasPendingChanges={hasPendingFilterChanges}
          onReset={handleReset}
          defaultRangePreset={defaultRangePreset}
          tenureAvailable={Boolean(tenurePolicy?.enabled)}
          projects={filteredProjects}
          members={members}
          projectsLoading={projectsQuery.isPending}
          trailingActions={
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={
                  entries.length === 0 || exportCsvMutation.isPending || entriesQuery.isFetching
                }
                onClick={() => void downloadCsv()}
              >
                Create report
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="px-2.5"
                aria-label="Report history"
                title="Report history"
              >
                <History />
              </Button>
            </>
          }
        />
      )}

      {entriesQuery.isPending && !entriesQuery.isPlaceholderData ? (
        <div className="overflow-hidden rounded-2xl border border-default bg-default">
          <div className="border-b border-default bg-muted/55 px-4 py-2.5">
            <Skeleton className="h-3 w-64" />
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="border-b border-default px-4 py-3">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      ) : entriesQuery.isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load reports.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(entriesQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void entriesQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time logged in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Work, then adjust filters if needed.
          </p>
        </div>
      ) : (
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
                        <tr key={row.id} className="border-b border-default last:border-b-0">
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

          <p className="text-xs text-muted">
            <span className={agencyMetricClass}>{entries.length}</span>
            {entries.length === 1 ? " entry" : " entries"}
            <span aria-hidden="true"> · </span>
            <span className={agencyMetricClass}>{formatDuration(totalSeconds, "clock")}</span>
            {" total"}
          </p>
        </div>
      )}
    </div>
  );
}
