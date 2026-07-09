import { AlertTriangle, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";
import { useAgencyCapacityQuery } from "@/features/shared/agency-queries";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  selectIsCapacityMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";

type AgencyResourcingSurfaceProps = {
  teamId: string;
};

const WEEKS_AHEAD = 4;

function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

type MemberRow = {
  userId: string;
  userName: string;
  cells: { weekStart: string; capacity: number; logged: number; booked: number }[];
};

export function AgencyResourcingSurface({ teamId }: AgencyResourcingSurfaceProps) {
  const agencyOps = useAgencyOpsStore();
  const isCapacityMutationPending = useAgencyOpsStore(selectIsCapacityMutationPending);

  const weekStartIso = startOfWeekUtc(new Date()).toISOString();

  const upcomingWeekStarts = useMemo(() => {
    const base = startOfWeekUtc(new Date());
    return Array.from({ length: WEEKS_AHEAD }, (_, index) => {
      const next = new Date(base);
      next.setUTCDate(next.getUTCDate() + index * 7);
      return next;
    });
  }, []);

  const capacityQuery = useAgencyCapacityQuery(teamId, weekStartIso, WEEKS_AHEAD);

  const weeks = capacityQuery.data?.weeks ?? [];

  const memberRows = useMemo<MemberRow[]>(() => {
    const map = new Map<string, MemberRow>();
    for (const week of weeks) {
      for (const member of week.members) {
        const existing = map.get(member.userId) ?? {
          userId: member.userId,
          userName: member.userName,
          cells: [],
        };
        existing.cells.push({
          weekStart: week.weekStart,
          capacity: member.capacitySeconds,
          logged: member.loggedSeconds,
          booked: member.bookedSeconds,
        });
        map.set(member.userId, existing);
      }
    }
    return [...map.values()];
  }, [weeks]);

  const [activeCellPopover, setActiveCellPopover] = useState<{
    userId: string;
    weekStart: string;
  } | null>(null);
  const [capacityDraftHours, setCapacityDraftHours] = useState("");

  function formatWeekLabel(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function utilizationPct(cell: MemberRow["cells"][number]): number {
    if (cell.capacity <= 0) return 0;
    return Math.round(((cell.logged + cell.booked) / cell.capacity) * 100);
  }

  function utilizationTone(pct: number): string {
    if (pct === 0) return "bg-elevated text-dimmed";
    if (pct < 70) return "bg-success/15 text-success";
    if (pct < 95) return "bg-warning/20 text-warning";
    return "bg-error/20 text-error";
  }

  function openCellPopover(userId: string, weekStart: string, currentCapacitySeconds: number) {
    if (activeCellPopover?.userId === userId && activeCellPopover.weekStart === weekStart) {
      setActiveCellPopover(null);
      return;
    }
    setActiveCellPopover({ userId, weekStart });
    setCapacityDraftHours(
      currentCapacitySeconds > 0 ? String(Math.round(currentCapacitySeconds / 3600)) : "",
    );
  }

  function getCell(row: MemberRow, weekStart: string) {
    return row.cells.find((cell) => cell.weekStart === weekStart);
  }

  async function saveCapacity(userId: string, weekStart: string) {
    const hours = parseFloat(capacityDraftHours);
    if (Number.isNaN(hours) || hours < 0) return;

    const d = new Date(weekStart);
    const diff = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    const mondayIso = d.toISOString();

    await agencyOps.setCapacity(
      {
        teamId,
        userId,
        weekStart: mondayIso,
        capacitySeconds: Math.round(hours * 3600),
      },
      { onSuccess: () => setActiveCellPopover(null) },
    );
  }

  return (
    <div className="agency-resourcing space-y-4">
      {capacityQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : capacityQuery.isError ? (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load capacity.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(capacityQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void capacityQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-default bg-default">
            <table className="w-full min-w-[40rem] text-xs">
              <thead className="border-b border-default bg-muted">
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  <th className="w-56 px-4 py-2.5 font-bold">Member</th>
                  {upcomingWeekStarts.map((weekStart, index) => (
                    <th key={weekStart.toISOString()} className="px-3 py-2.5 text-center font-bold">
                      {index === 0 ? "This week" : formatWeekLabel(weekStart.toISOString())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberRows.length === 0 ? (
                  <tr>
                    <td colSpan={upcomingWeekStarts.length + 1} className="px-4 py-12 text-center">
                      <CalendarRange className="mx-auto size-6 text-muted" />
                      <p className="mt-3 text-sm font-bold text-highlighted">Capacity isn't set.</p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
                        Add weekly hours per member to see utilization across the team. Once set,
                        this grid colors each cell by how much of a member's week is committed.
                      </p>
                    </td>
                  </tr>
                ) : (
                  memberRows.map((row) => (
                    <tr key={row.userId} className="border-b border-default last:border-b-0">
                      <td className="px-4 py-3">
                        <span className="truncate font-bold text-highlighted">{row.userName}</span>
                      </td>
                      {upcomingWeekStarts.map((weekStart, colIndex) => {
                        const weekIso = weekStart.toISOString();
                        const cell = getCell(row, weekIso) ?? {
                          weekStart: weekIso,
                          capacity: 0,
                          logged: 0,
                          booked: 0,
                        };
                        const pct = utilizationPct(cell);

                        return (
                          <td key={weekIso} className="px-2 py-2">
                            <Popover
                              open={
                                activeCellPopover?.userId === row.userId &&
                                activeCellPopover.weekStart === weekIso
                              }
                              onOpenChange={(open) => {
                                if (!open) setActiveCellPopover(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "flex h-12 w-full flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    utilizationTone(pct),
                                  )}
                                  onClick={() =>
                                    openCellPopover(row.userId, weekIso, cell.capacity)
                                  }
                                >
                                  <span className="font-mono tabular-nums">{pct}%</span>
                                  <span className="font-mono text-[10px] tabular-nums opacity-70">
                                    {formatDuration(cell.logged + cell.booked, "short")} /{" "}
                                    {formatDuration(cell.capacity, "short")}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-3 text-xs">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                                  {colIndex === 0 ? "This week" : formatWeekLabel(weekIso)}
                                </p>
                                <ul className="mt-2 space-y-1.5">
                                  <li className="flex items-center justify-between gap-4">
                                    <span className="text-muted">Logged</span>
                                    <span className="font-mono tabular-nums text-highlighted">
                                      {formatDuration(cell.logged, "short")}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between gap-4">
                                    <span className="text-muted">Booked</span>
                                    <span className="font-mono tabular-nums text-highlighted">
                                      {formatDuration(cell.booked, "short")}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between gap-4 border-t border-default pt-1.5">
                                    <span className="text-muted">Capacity</span>
                                    <span className="font-mono tabular-nums text-highlighted">
                                      {formatDuration(cell.capacity, "short")}
                                    </span>
                                  </li>
                                </ul>
                                <div className="mt-3 border-t border-default pt-3">
                                  <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                                    Set capacity (hours)
                                  </label>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <Input
                                      value={capacityDraftHours}
                                      onChange={(e) => setCapacityDraftHours(e.target.value)}
                                      type="number"
                                      min={0}
                                      step={1}
                                      className="flex-1"
                                      placeholder="e.g. 40"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          void saveCapacity(row.userId, weekIso);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      disabled={isCapacityMutationPending}
                                      onClick={() => void saveCapacity(row.userId, weekIso)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {memberRows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-muted">
              <span className="font-bold uppercase tracking-[0.16em]">Utilization</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm bg-success/40"
                  aria-hidden="true"
                />
                Under 70%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm bg-warning/40"
                  aria-hidden="true"
                />
                70–94%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-sm bg-error/40" aria-hidden="true" />
                95% or over
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
