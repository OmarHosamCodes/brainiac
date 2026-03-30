import { workspaceTeamRoleSchema } from "@brainiac/workspace";
import { z } from "zod";

import { protectedProcedure } from "../../procedures";
import {
  addTeamMember,
  createTeam,
  listUserTeams,
  removeTeamMember,
  updateTeamMemberRole,
} from "./service";

const teamSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  role: workspaceTeamRoleSchema,
  createdByUserId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

const teamCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
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
  create: protectedProcedure.input(teamCreateInputSchema).handler(async ({ context, input }) => {
    return teamSummarySchema.parse(await createTeam(context.session.user.id, input.name.trim()));
  }),
  members: {
    add: protectedProcedure.input(teamAddMemberInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          teamId: z.string().min(1),
          userId: z.string().min(1),
          userName: z.string().min(1),
          userEmail: z.email(),
          role: workspaceTeamRoleSchema,
        })
        .parse(await addTeamMember(context.session.user.id, input));
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
