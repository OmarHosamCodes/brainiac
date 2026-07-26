import { tool } from "@openrouter/sdk/lib/tool";
import { z } from "zod";

import type { AgencyAgentRuntime } from "./types";

const agencyTimeEntrySchema = z.object({
  id: z.string(),
  description: z.string(),
  projectName: z.string(),
  clientName: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  startedAt: z.string(),
  endedAt: z.string(),
  isBillable: z.boolean(),
});

export function buildAgencyAgentTools(runtime: AgencyAgentRuntime) {
  return [
    tool({
      name: "get_current_time",
      description: "Get the current ISO timestamp for time-sensitive planning questions.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        iso: z.string(),
      }),
      execute: async () => ({
        iso: new Date().toISOString(),
      }),
    }),
    tool({
      name: "list_agency_time_entries",
      description: "List the current user's recent Agency time entries for the active team.",
      inputSchema: z.object({
        page: z.number().int().min(1).max(50).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      }),
      outputSchema: z.object({
        entries: z.array(agencyTimeEntrySchema),
      }),
      execute: async ({ page, pageSize }) => runtime.listMyTimeEntries({ page, pageSize }),
    }),
    tool({
      name: "list_agency_projects",
      description: "List Agency projects and their clients for the active team.",
      inputSchema: z.object({
        clientId: z.string().trim().min(1).optional(),
      }),
      outputSchema: z.object({
        projects: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            clientId: z.string(),
            clientName: z.string(),
          }),
        ),
      }),
      execute: async ({ clientId }) => runtime.listProjects(clientId ? { clientId } : {}),
    }),
    tool({
      name: "list_agency_members",
      description: "List members and roles for the active Agency team.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        members: z.array(
          z.object({
            userId: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.string(),
          }),
        ),
      }),
      execute: async () => runtime.listMembers(),
    }),
    tool({
      name: "get_agency_time_summary",
      description: "Summarize tracked seconds by member for a date range on the active team.",
      inputSchema: z.object({
        from: z.string().trim().min(1),
        to: z.string().trim().min(1),
        memberUserId: z.string().trim().min(1).optional(),
        projectId: z.string().trim().min(1).optional(),
        clientId: z.string().trim().min(1).optional(),
      }),
      outputSchema: z.object({
        totalSeconds: z.number().int().nonnegative(),
        members: z.array(
          z.object({
            userId: z.string(),
            name: z.string(),
            seconds: z.number().int().nonnegative(),
            isTiming: z.boolean(),
          }),
        ),
      }),
      execute: async (input) => runtime.getTimeSummary(input),
    }),
    tool({
      name: "get_agency_reports_summary",
      description: "Summarize Agency hours by client, project, and member for a date range.",
      inputSchema: z.object({
        from: z.string().trim().min(1),
        to: z.string().trim().min(1),
        memberUserId: z.string().trim().min(1).optional(),
        projectId: z.string().trim().min(1).optional(),
        clientId: z.string().trim().min(1).optional(),
      }),
      outputSchema: z.object({
        totalSeconds: z.number().int().nonnegative(),
        byClient: z.array(
          z.object({
            clientId: z.string(),
            clientName: z.string(),
            seconds: z.number().int().nonnegative(),
          }),
        ),
        byProject: z.array(
          z.object({
            projectId: z.string(),
            projectName: z.string(),
            clientName: z.string(),
            seconds: z.number().int().nonnegative(),
          }),
        ),
        byMember: z.array(
          z.object({
            userId: z.string(),
            userName: z.string(),
            seconds: z.number().int().nonnegative(),
          }),
        ),
      }),
      execute: async (input) => runtime.getReportsSummary(input),
    }),
  ];
}
