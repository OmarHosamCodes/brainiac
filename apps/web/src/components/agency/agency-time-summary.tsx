import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";

type AgencyTimeSummaryProps = {
  teamId: string;
};

type DatePreset = "this-week" | "last-month" | "year-to-date" | "custom";

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

export function AgencyTimeSummary({ teamId }: AgencyTimeSummaryProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>("this-week");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMemberUserId, setSelectedMemberUserId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (datePreset) {
      case "this-week": {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        from = new Date(now.getFullYear(), now.getMonth(), diff);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        break;
      }
      case "last-month": {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case "year-to-date": {
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
        break;
      }
      case "custom": {
        from = customFromDate
          ? new Date(customFromDate)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        to = customToDate ? new Date(customToDate) : now;
        break;
      }
      default: {
        const _exhaustive: never = datePreset;
        return _exhaustive;
      }
    }

    return { from, to };
  }, [customFromDate, customToDate, datePreset]);

  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: { teamId, clientId: selectedClientId || undefined },
    }),
    enabled: Boolean(teamId),
  });

  const tagsQuery = useQuery({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const summaryQuery = useQuery({
    ...orpc.agencyOps.summary.list.queryOptions({
      input: {
        teamId,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        clientId: selectedClientId || undefined,
        projectId: selectedProjectId || undefined,
        memberUserId: selectedMemberUserId || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      },
    }),
    enabled: Boolean(teamId),
  });

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const tags = tagsQuery.data?.items ?? [];
  const summaryData = summaryQuery.data?.summary ?? null;

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  }

  const presets: Array<{ label: string; value: DatePreset }> = [
    { label: "This week", value: "this-week" },
    { label: "Last month", value: "last-month" },
    { label: "YTD", value: "year-to-date" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted">
            Period
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant={datePreset === preset.value ? "secondary" : "ghost"}
                className="rounded-full"
                onClick={() => setDatePreset(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {datePreset === "custom" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} />
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Client</Label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-default bg-background px-2 text-sm"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Project</Label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-default bg-background px-2 text-sm"
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Member</Label>
            <select
              value={selectedMemberUserId}
              onChange={(e) => setSelectedMemberUserId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-default bg-background px-2 text-sm"
            >
              <option value="">All members</option>
              {(summaryData?.teamMembers ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tags</Label>
            {tags.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {tags.slice(0, 3).map((tag) => (
                  <Button
                    key={tag.id}
                    size="sm"
                    variant={selectedTagIds.includes(tag.id) ? "secondary" : "ghost"}
                    className="rounded-full"
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Button>
                ))}
                {tags.length > 3 ? (
                  <span className="text-xs text-muted">+{tags.length - 3} more</span>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted">No tags yet</p>
            )}
          </div>
        </div>
      </Card>

      {summaryData ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Total hours</p>
            <p className="mt-2 text-2xl font-bold text-highlighted">
              {formatHours(summaryData.totalSeconds)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Active timers</p>
            <p className="mt-2 text-2xl font-bold text-primary">{summaryData.activeCount ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Team members</p>
            <p className="mt-2 text-2xl font-bold text-highlighted">
              {summaryData.teamMembers?.length ?? 0}
            </p>
          </Card>
        </div>
      ) : null}

      {summaryData?.teamMembers && summaryData.teamMembers.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-default bg-elevated">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-default bg-elevated/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Member</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Latest Activity</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {summaryData.teamMembers.map((member) => (
                  <tr key={member.id} className="transition-colors hover:bg-elevated/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {member.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-highlighted">{member.name}</p>
                          <p className="truncate text-xs text-muted">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {member.latestEntry ? (
                        <div>
                          <div className="flex items-center gap-2">
                            {member.isActive ? (
                              <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
                            ) : null}
                            <p className="text-sm text-muted">{member.latestEntry.projectName}</p>
                          </div>
                          {member.latestEntry.description ? (
                            <p className="mt-1 truncate text-xs text-muted">
                              {member.latestEntry.description}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted">No activity</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-mono font-semibold text-highlighted">
                        {formatHours(member.totalSeconds)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !summaryQuery.isPending ? (
        <div className="rounded-2xl border border-dashed border-muted/30 p-8 text-center">
          <Inbox className="mx-auto size-8 text-muted" />
          <p className="mt-4 font-medium text-muted">No time tracked in this period</p>
          <p className="mt-1 text-sm text-dimmed">Try adjusting your filters or date range.</p>
        </div>
      ) : null}

      {summaryQuery.isPending ? (
        <div className="rounded-2xl border border-default bg-elevated p-6">
          <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
          <div className="mt-4 h-44 animate-pulse rounded-xl bg-muted/30" />
        </div>
      ) : null}
    </div>
  );
}
