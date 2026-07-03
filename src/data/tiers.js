export const MIN_TIER = 1;
export const MAX_TIER = 6;

/**
 * Tier metadata used by the shop and run progression.
 * unlockRound: first round this tier can appear in the shop pool.
 * shopCost: gold to buy a pet of this tier (SAP uses 3 for all tiers).
 */
export const TIER_CONFIG = {
  1: {
    tier: 1,
    label: "Tier 1",
    unlockRound: 1,
    shopCost: 3,
  },
  2: {
    tier: 2,
    label: "Tier 2",
    unlockRound: 3,
    shopCost: 3,
  },
  3: {
    tier: 3,
    label: "Tier 3",
    unlockRound: 5,
    shopCost: 3,
  },
  4: {
    tier: 4,
    label: "Tier 4",
    unlockRound: 7,
    shopCost: 3,
  },
  5: {
    tier: 5,
    label: "Tier 5",
    unlockRound: 9,
    shopCost: 3,
  },
  6: {
    tier: 6,
    label: "Tier 6",
    unlockRound: 11,
    shopCost: 3,
  },
};

export function getTierConfig(tier) {
  return TIER_CONFIG[tier] ?? null;
}

export function getShopCostForTier(tier) {
  const config = getTierConfig(tier);
  return config?.shopCost ?? 3;
}

export function getUnlockedTiersForRound(round) {
  return Object.values(TIER_CONFIG)
    .filter((config) => round >= config.unlockRound)
    .map((config) => config.tier);
}
