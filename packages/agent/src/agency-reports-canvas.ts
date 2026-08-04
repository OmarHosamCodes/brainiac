import type { AgencyAgentRuntime, AgentToolCall, DashboardAgentToolPreset } from "./types";
import type { AiUiArtifact } from "./ui-artifact";

/** Ask-only — Plan/Agent must not get the canned hours canvas (looks like chat leak). */
export function shouldBootstrapAgencyMonthReports(toolPreset: DashboardAgentToolPreset): boolean {
  return toolPreset === "ask";
}

/** Mode-specific nudge when Agency tools were available but unused. */
export function agencyToolRetryNote(toolPreset: DashboardAgentToolPreset): string {
  switch (toolPreset) {
    case "ask":
      return "You answered without calling Agency tools. Call get_agency_reports_summary or get_agency_time_summary with {from,to} for this month, then ui_present a schema canvas. Do not invent hours or narrate tool calls.";
    case "plan":
      return "You answered without calling Agency tools. Use get_agency_* reads if needed, call draft_agency_plan, then ui_present a schema plan overview. Do not invent data or dump a hours canvas.";
    case "agent":
      return "You answered without calling Agency tools. Use get_agency_* reads if needed, then propose_agency_action and ui_present before/after. Do not invent data or dump a hours canvas.";
    default: {
      const _exhaustive: never = toolPreset;
      return _exhaustive;
    }
  }
}

/** Nudge when tools ran but the model skipped the canvas. */
export function agencyUiPresentRetryNote(toolPreset: DashboardAgentToolPreset): string {
  switch (toolPreset) {
    case "ask":
      return "You already called Agency tools but did not call ui_present. Call ui_present now with a schema canvas of the results, then reply with one short line. Do not dump JSON or markdown tables.";
    case "plan":
      return "You already called Agency tools but did not call ui_present. Call ui_present now with a schema overview of the plan or findings, then one short line asking the user to Confirm. Do not dump JSON or markdown tables.";
    case "agent":
      return "You already called Agency tools but did not call ui_present. Call ui_present now with a before/after schema canvas, then one short line. Do not dump JSON or markdown tables.";
    default: {
      const _exhaustive: never = toolPreset;
      return _exhaustive;
    }
  }
}

function hoursLabel(seconds: number): string {
  return (seconds / 3_600).toFixed(1);
}

function monthRangeUtc(now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const from = `${to.slice(0, 8)}01`;
  return { from, to };
}

type ReportsSummary = Awaited<ReturnType<AgencyAgentRuntime["getReportsSummary"]>>;

/** Schema canvas for Agency month hours when the model skips tools. */
export function buildAgencyMonthHoursArtifact(
  summary: ReportsSummary,
  from: string,
  to: string,
): AiUiArtifact {
  const projectRows = summary.byProject
    .slice(0, 12)
    .map((project) => [
      project.projectName,
      hoursLabel(project.nonWasteSeconds),
      hoursLabel(project.wasteSeconds),
      hoursLabel(project.seconds),
    ]);
  const memberRows = summary.byMember
    .slice(0, 12)
    .map((member) => [
      member.userName,
      hoursLabel(member.nonWasteSeconds),
      hoursLabel(member.wasteSeconds),
      hoursLabel(member.seconds),
    ]);

  return {
    id: `agency-hours-${from}-${to}`,
    kind: "schema",
    title: `Team hours ${from} → ${to}`,
    schema: {
      version: 1,
      root: {
        type: "stack",
        gap: "md",
        children: [
          {
            type: "pillRow",
            pills: [
              { label: `${from} → ${to}`, tone: "muted" },
              { label: `${hoursLabel(summary.composition.totalSeconds)}h total`, tone: "accent" },
            ],
          },
          {
            type: "grid",
            columns: 3,
            gap: "md",
            children: [
              {
                type: "stat",
                label: "Paid",
                value: `${hoursLabel(summary.composition.paidSeconds)}h`,
              },
              {
                type: "stat",
                label: "Waste",
                value: `${hoursLabel(summary.composition.wasteSeconds)}h`,
              },
              {
                type: "stat",
                label: "Internal",
                value: `${hoursLabel(summary.composition.internalSeconds)}h`,
              },
            ],
          },
          ...(projectRows.length > 0
            ? [
                {
                  type: "table" as const,
                  columns: ["Project", "Non-waste h", "Waste h", "Total h"],
                  rows: projectRows,
                },
              ]
            : [
                {
                  type: "callout" as const,
                  tone: "info" as const,
                  title: "No project hours",
                  body: "No tracked time in this range yet.",
                },
              ]),
          ...(memberRows.length > 0
            ? [
                {
                  type: "table" as const,
                  columns: ["Member", "Non-waste h", "Waste h", "Total h"],
                  rows: memberRows,
                },
              ]
            : []),
        ],
      },
    },
  };
}

export type AgencyReportsBootstrapResult = {
  tool: AgentToolCall;
  artifact: AiUiArtifact;
  responseText: string;
};

/**
 * When the model refuses/skips Agency tools, load this month's reports and paint the canvas.
 * ponytail: deterministic fallback — upgrade by teaching models to call tools reliably.
 */
export async function bootstrapAgencyMonthReportsCanvas(
  runtime: AgencyAgentRuntime,
  now = new Date(),
): Promise<AgencyReportsBootstrapResult> {
  const { from, to } = monthRangeUtc(now);
  const summary = await runtime.getReportsSummary({ from, to });
  const artifact = buildAgencyMonthHoursArtifact(summary, from, to);
  const tool: AgentToolCall = {
    id: `bootstrap-get_agency_reports_summary-${from}`,
    name: "get_agency_reports_summary",
    input: { from, to },
    output: summary,
    status: "completed",
    error: null,
  };
  return {
    tool,
    artifact,
    responseText: `Loaded team hours for ${from} → ${to} in the canvas.`,
  };
}
