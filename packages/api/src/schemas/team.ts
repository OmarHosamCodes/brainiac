import { workspaceTeamRoleSchema } from "@orch/workspace";
import { z } from "zod";

export const teamMemberSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userEmail: z.email(),
  role: workspaceTeamRoleSchema,
  joinedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const teamSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  role: workspaceTeamRoleSchema,
  createdByUserId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const teamDetailSchema = teamSummarySchema.extend({
  members: z.array(teamMemberSchema),
});

export const teamCreateInputSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(120),
});

export const teamGetInputSchema = z.object({
  teamId: z.string().min(1),
});

export const teamUpdateInputSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().trim().min(1, "Team name is required").max(120),
});

export const teamDeleteInputSchema = z.object({
  teamId: z.string().min(1),
});

export const teamAddMemberInputSchema = z.object({
  teamId: z.string().min(1),
  userEmail: z.email("Enter a valid email address"),
  role: workspaceTeamRoleSchema,
});

export const teamUpdateMemberRoleInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: workspaceTeamRoleSchema,
});

export const teamRemoveMemberInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
});

/** Form-only schemas (omit server-assigned teamId). */
export const teamCreateFormSchema = teamCreateInputSchema;
export const teamAddMemberFormSchema = teamAddMemberInputSchema.omit({ teamId: true });
