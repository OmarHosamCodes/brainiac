export const TIERS = ["free", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export type TierLimits = {
  workspaceNodes: number;
  blocksPerTab: number;
  tabsPerNode: number;
  teams: number;
  teamMembers: number;
  aiConversations: number;
  agencyOps: boolean;
  marketplacePublish: boolean;
};

export const TIER_LIMITS = {
  free: {
    workspaceNodes: 10,
    blocksPerTab: 6,
    tabsPerNode: 3,
    teams: 1,
    teamMembers: 3,
    aiConversations: 5,
    agencyOps: false,
    marketplacePublish: false,
  },
  pro: {
    workspaceNodes: 200,
    blocksPerTab: 24,
    tabsPerNode: 12,
    teams: 5,
    teamMembers: 20,
    aiConversations: -1, // unlimited
    agencyOps: true,
    marketplacePublish: true,
  },
} as const satisfies Record<Tier, TierLimits>;

export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}

export type GatedFeature = "agencyOps" | "marketplacePublish";

export function canAccessFeature(tier: Tier, feature: GatedFeature): boolean {
  return TIER_LIMITS[tier][feature];
}
