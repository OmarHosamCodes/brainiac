import { workspaceTeamRoleSchema } from "@brainiac/workspace";
import { z } from "zod";

import { getBillingStateForUser } from "../../billing-guard";
import { protectedProcedure } from "../../procedures";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeam,
  listUserTeams,
  listTeamMembers,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "./service";

const teamMemberSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userEmail: z.email(),
  role: workspaceTeamRoleSchema,
  joinedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const teamSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  role: workspaceTeamRoleSchema,
  createdByUserId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

const teamDetailSchema = teamSummarySchema.extend({
  members: z.array(teamMemberSchema),
});

const teamCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const teamGetInputSchema = z.object({
  teamId: z.string().min(1),
});

const teamUpdateInputSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
});

const teamDeleteInputSchema = z.object({
  teamId: z.string().min(1),
});

const teamAddMemberInputSchema = z.object({
  teamId: z.string().min(1),
  userEmail: z.email(),
  role: workspaceTeamRoleSchema,
});

const teamUpdateMemberRoleInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: workspaceTeamRoleSchema,
});

const teamRemoveMemberInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
});

export const teamRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const teams = await listUserTeams(context.session.user.id);

    return z.object({ items: z.array(teamSummarySchema) }).parse({ items: teams });
  }),
  get: protectedProcedure.input(teamGetInputSchema).handler(async ({ context, input }) => {
    return teamDetailSchema.parse(await getTeam(context.session.user.id, input.teamId));
  }),
  create: protectedProcedure.input(teamCreateInputSchema).handler(async ({ context, input }) => {
    const billing = await getBillingStateForUser(context.session.user.id);
    const existing = await listUserTeams(context.session.user.id);

    if (existing.length >= billing.limits.teams) {
      const { ORPCError } = await import("@orpc/server");
      throw new ORPCError("FORBIDDEN", {
        message: `Your ${billing.tier} plan allows up to ${billing.limits.teams} team(s)`,
        data: { limit: billing.limits.teams, current: existing.length },
      });
    }

    return teamSummarySchema.parse(await createTeam(context.session.user.id, input.name.trim()));
  }),
  update: protectedProcedure.input(teamUpdateInputSchema).handler(async ({ context, input }) => {
    const team = await updateTeam(context.session.user.id, {
      teamId: input.teamId,
      name: input.name.trim(),
    });
    const actorMembership = await listUserTeams(context.session.user.id);
    const actorTeam = actorMembership.find((item) => item.id === team.id);

    return teamSummarySchema.parse({
      id: team.id,
      name: team.name,
      role: actorTeam?.role ?? "owner",
      createdByUserId: team.createdByUserId,
      updatedAt: team.updatedAt,
    });
  }),
  delete: protectedProcedure.input(teamDeleteInputSchema).handler(async ({ context, input }) => {
    return z
      .object({
        teamId: z.string().min(1),
        deleted: z.boolean(),
      })
      .parse(await deleteTeam(context.session.user.id, input));
  }),
  members: {
    list: protectedProcedure.input(teamGetInputSchema).handler(async ({ context, input }) => {
      return z.object({ items: z.array(teamMemberSchema) }).parse({
        items: await listTeamMembers(context.session.user.id, input.teamId),
      });
    }),
    add: protectedProcedure.input(teamAddMemberInputSchema).handler(async ({ context, input }) => {
      const added = await addTeamMember(context.session.user.id, input);
      const members = await listTeamMembers(context.session.user.id, input.teamId);
      const member = members.find((item) => item.userId === added.userId);

      if (!member) {
        throw new Error("Failed to load added member");
      }

      return teamMemberSchema.parse(member);
    }),
    updateRole: protectedProcedure
      .input(teamUpdateMemberRoleInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            teamId: z.string().min(1),
            userId: z.string().min(1),
            role: workspaceTeamRoleSchema,
          })
          .parse(await updateTeamMemberRole(context.session.user.id, input));
      }),
    remove: protectedProcedure
      .input(teamRemoveMemberInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            teamId: z.string().min(1),
            userId: z.string().min(1),
            removed: z.boolean(),
          })
          .parse(await removeTeamMember(context.session.user.id, input));
      }),
  },
};
