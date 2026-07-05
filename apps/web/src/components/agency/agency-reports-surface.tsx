import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart2, History } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  AgencyDashboardCommandBar,
  type RangePreset,
} from "@/components/agency/agency-dashboard-command-bar";
import { AgencyReportsTable } from "@/components/agency/agency-reports-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllReportEntries } from "@/lib/agency/reports/fetch-report-entries";
import { orpc } from "@/lib/orpc";
import { useAgencyClientsQuery } from "@/lib/queries/agency";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
} from "@/lib/tenure-utils";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyReportsSurfaceProps = {
  teamId: string;
};

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

export function AgencyReportsSurface({ teamId }: AgencyReportsSurfaceProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  function openReportCreator() {
    const next = new URLSearchParams(searchParams);
    next.set("section", "reports");
    next.set("report", "create");
    next.set("from", range.from);
    next.set("to", range.to);
    if (appliedFilters.clientId) next.set("client", appliedFilters.clientId);
    else next.delete("client");
    if (appliedFilters.projectId) next.set("project", appliedFilters.projectId);
    else next.delete("project");
    if (appliedFilters.memberUserId) next.set("member", appliedFilters.memberUserId);
    else next.delete("member");
    navigate(`/agency?${next.toString()}`);
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
                disabled={entries.length === 0 || entriesQuery.isFetching}
                onClick={openReportCreator}
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
        <AgencyReportsTable entries={entries} />
      )}
    </div>
  );
}
