import { Inbox } from "lucide-react";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import type { AgencyTimeSummaryViewModel, DatePreset } from "./hooks/use-agency-time-summary";

type Props = AgencyTimeSummaryViewModel;

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

export function AgencyTimeSummaryView(props: Props) {
  const {
    datePreset,
    setDatePreset,
    customFromDate,
    setCustomFromDate,
    customToDate,
    setCustomToDate,
    selectedClientId,
    setSelectedClientId,
    selectedProjectId,
    setSelectedProjectId,
    selectedMemberUserId,
    setSelectedMemberUserId,
    clients,
    projects,
    summaryData,
  } = props;
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
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
              />
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
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
        </div>
      </Card>
      {summaryData ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Total hours
            </p>
            <p className="mt-2 text-2xl font-bold text-highlighted">
              {formatHours(summaryData.totalSeconds)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Active timers
            </p>
            <p className="mt-2 text-2xl font-bold text-primary">{summaryData.activeCount ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Team members
            </p>
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
                      <p className="text-sm text-muted">
                        {member.latestEntry?.projectName ?? "None"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">{formatHours(member.totalSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-default p-10 text-center">
          <Inbox className="size-5 text-muted" />
          <p className="text-sm text-muted">No summary data.</p>
        </div>
      )}
    </div>
  );
}
