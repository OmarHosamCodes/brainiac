import { TIERS } from "@brainiac/workspace/tiers";
import { z } from "zod";

export const billingStateSchema = z.object({
  tier: z.enum(TIERS),
  subscription: z
    .object({
      productId: z.string().min(1),
      status: z.string().min(1),
      currentPeriodEnd: z.string().datetime().nullable(),
      source: z.enum(["polar", "lifetime"]),
      isLifetime: z.boolean(),
    })
    .nullable(),
  limits: z.object({
    workspaceNodes: z.number().int(),
    blocksPerTab: z.number().int(),
    tabsPerNode: z.number().int(),
    teams: z.number().int(),
    teamMembers: z.number().int(),
    aiConversations: z.number().int(),
    agencyOps: z.boolean(),
    marketplacePublish: z.boolean(),
  }),
});
