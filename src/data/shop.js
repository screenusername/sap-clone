import { REROLL_COST, SELL_VALUE } from "../config/game.js";
import { createPetInstance, getAllPetDefinitions } from "./pets.js";
import { getUnlockedTiersForRound } from "./tiers.js";

/**
 * Shop slot count grows as more tiers unlock.
 * Tier 1 only → 3 offers; each new unlocked tier adds one slot.
 */
export function getShopOfferCountForRound(round) {
  const unlockedTierCount = getUnlockedTiersForRound(round).length;
  return 2 + unlockedTierCount;
}

export function getShopPoolForRound(round) {
  const unlockedTiers = new Set(getUnlockedTiersForRound(round));
  return getAllPetDefinitions().filter((pet) => unlockedTiers.has(pet.tier));
}

export function rollShopOffers(round, offerCount = getShopOfferCountForRound(round)) {
  const pool = getShopPoolForRound(round);

  if (pool.length === 0) {
    return [];
  }

  return Array.from({ length: offerCount }, () => {
    const definition = pool[Math.floor(Math.random() * pool.length)];
    return createPetInstance(definition.id);
  });
}

export function rollSingleShopOffer(round) {
  const pool = getShopPoolForRound(round);

  if (pool.length === 0) {
    return null;
  }

  const definition = pool[Math.floor(Math.random() * pool.length)];
  return createPetInstance(definition.id);
}

export function getRerollCost() {
  return REROLL_COST;
}

export function getSellValue() {
  return SELL_VALUE;
}
