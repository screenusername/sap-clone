import { ABILITY_TRIGGERS } from "./abilityTriggers.js";
import { getShopCostForTier } from "./tiers.js";

/**
 * Static pet roster. Each entry is a pet definition (template), not a runtime instance.
 *
 * Fields:
 * - id: stable key for assets, saves, and lookups
 * - name: display name
 * - tier: shop tier (1–6)
 * - attack / health: base stats at level 1
 * - ability: trigger + description for UI; battle logic comes later
 * - hasBattlerArt: whether a PNG exists in assets/battlers/
 * - color: optional UI tint for placeholders and effects
 */
export const PET_DEFINITIONS = [
  // Tier 1
  {
    id: "slime",
    name: "Slime",
    tier: 1,
    attack: 1,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Give a random friend +1 health.",
    },
    hasBattlerArt: true,
    color: 0x69db7c,
  },
  {
    id: "cat",
    name: "Cat",
    tier: 1,
    attack: 2,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Give a random friend +1/+1.",
    },
    hasBattlerArt: true,
    color: 0xffd43b,
  },
  {
    id: "nun",
    name: "Nun",
    tier: 1,
    attack: 1,
    health: 3,
    ability: {
      trigger: ABILITY_TRIGGERS.START_OF_BATTLE,
      description: "Start of battle: Give all friends +1 health.",
    },
    hasBattlerArt: true,
    color: 0xeceff1,
  },
  {
    id: "punk",
    name: "Punk",
    tier: 1,
    attack: 3,
    health: 1,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Deal 1 damage to a random enemy.",
    },
    hasBattlerArt: true,
    color: 0xe64980,
  },
  {
    id: "goth",
    name: "Goth",
    tier: 1,
    attack: 2,
    health: 1,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Give a random friend +1 attack.",
    },
    hasBattlerArt: true,
    color: 0x5c3d6e,
  },
  {
    id: "wolf",
    name: "Wolf",
    tier: 1,
    attack: 2,
    health: 1,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Give the friend behind +1 attack.",
    },
    hasBattlerArt: true,
    color: 0x8d6e63,
  },

  // Tier 2
  {
    id: "baboon",
    name: "Baboon",
    tier: 2,
    attack: 3,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.END_OF_TURN,
      description: "End of turn: Give the friend ahead +2 attack.",
    },
    hasBattlerArt: true,
    color: 0xffa94d,
  },
  {
    id: "crab",
    name: "Crab",
    tier: 2,
    attack: 3,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.START_OF_BATTLE,
      description: "Start of battle: Give all friends +1 health.",
    },
    hasBattlerArt: false,
    color: 0xe57373,
  },
  {
    id: "dodo",
    name: "Dodo",
    tier: 2,
    attack: 2,
    health: 3,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Give the friend behind +2/+1.",
    },
    hasBattlerArt: false,
    color: 0xffcc80,
  },
  {
    id: "flamingo",
    name: "Flamingo",
    tier: 2,
    attack: 2,
    health: 3,
    ability: {
      trigger: ABILITY_TRIGGERS.END_OF_TURN,
      description: "End of turn: Give the friend behind +1 attack.",
    },
    hasBattlerArt: false,
    color: 0xf06292,
  },
  {
    id: "fox",
    name: "Fox",
    tier: 2,
    attack: 4,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Give a random friend +1 attack.",
    },
    hasBattlerArt: true,
    color: 0xda77f2,
  },
  {
    id: "hedgehog",
    name: "Hedgehog",
    tier: 2,
    attack: 3,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Deal 2 damage to all.",
    },
    hasBattlerArt: false,
    color: 0x9e9e9e,
  },
  {
    id: "peacock",
    name: "Peacock",
    tier: 2,
    attack: 2,
    health: 5,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Give all friends +1 attack.",
    },
    hasBattlerArt: false,
    color: 0x64b5f6,
  },
  {
    id: "rat",
    name: "Rat",
    tier: 2,
    attack: 4,
    health: 5,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Give friend behind +1 attack.",
    },
    hasBattlerArt: false,
    color: 0x78909c,
  },
  {
    id: "spider",
    name: "Spider",
    tier: 2,
    attack: 2,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.FAINT,
      description: "Faint: Summon a 1/1 Spider.",
    },
    hasBattlerArt: false,
    color: 0x5d4037,
  },
  {
    id: "swan",
    name: "Swan",
    tier: 2,
    attack: 1,
    health: 3,
    ability: {
      trigger: ABILITY_TRIGGERS.SELL,
      description: "Sell: Gain 2 gold.",
    },
    hasBattlerArt: false,
    color: 0xeceff1,
  },

  // Tier 3
  {
    id: "dog",
    name: "Dog",
    tier: 3,
    attack: 3,
    health: 1,
    ability: {
      trigger: ABILITY_TRIGGERS.BUY,
      description: "Buy: Give a random friend +1 attack.",
    },
    hasBattlerArt: true,
    color: 0x69db7c,
  },
  {
    id: "elephant",
    name: "Elephant",
    tier: 3,
    attack: 1,
    health: 4,
    ability: {
      trigger: ABILITY_TRIGGERS.BEFORE_ATTACK,
      description: "Before attack: Give friend behind +2 health.",
    },
    hasBattlerArt: true,
    color: 0x4dabf7,
  },
  {
    id: "blowfish",
    name: "Blowfish",
    tier: 3,
    attack: 3,
    health: 5,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Deal 2 damage to a random enemy.",
    },
    hasBattlerArt: false,
    color: 0xffab91,
  },
  {
    id: "camel",
    name: "Camel",
    tier: 3,
    attack: 2,
    health: 6,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Give friend behind +2 health.",
    },
    hasBattlerArt: false,
    color: 0xd4a574,
  },
  {
    id: "giraffe",
    name: "Giraffe",
    tier: 3,
    attack: 2,
    health: 7,
    ability: {
      trigger: ABILITY_TRIGGERS.END_OF_TURN,
      description: "End of turn: Give friend ahead +2/+2.",
    },
    hasBattlerArt: false,
    color: 0xffd180,
  },
  {
    id: "kangaroo",
    name: "Kangaroo",
    tier: 3,
    attack: 1,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.HURT,
      description: "Hurt: Give friend behind +2/+2.",
    },
    hasBattlerArt: false,
    color: 0xffb74d,
  },
  {
    id: "rabbit",
    name: "Rabbit",
    tier: 3,
    attack: 1,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.END_OF_TURN,
      description: "End of turn: Give friend behind +1 health.",
    },
    hasBattlerArt: false,
    color: 0xf5f5f5,
  },
  {
    id: "turtle",
    name: "Turtle",
    tier: 3,
    attack: 1,
    health: 2,
    ability: {
      trigger: ABILITY_TRIGGERS.START_OF_BATTLE,
      description: "Start of battle: Give friend ahead +2 health.",
    },
    hasBattlerArt: false,
    color: 0x66bb6a,
  },
];

const PET_BY_ID = new Map(PET_DEFINITIONS.map((pet) => [pet.id, pet]));

export const SAMPLE_TEAMS = {
  left: ["slime", "baboon", "cat"],
  right: ["dog", "elephant", "fox"],
};

export function getPetDefinition(petId) {
  return PET_BY_ID.get(petId) ?? null;
}

export function getAllPetDefinitions() {
  return [...PET_DEFINITIONS];
}

export function getPetsByTier(tier) {
  return PET_DEFINITIONS.filter((pet) => pet.tier === tier);
}

export function getPetsWithBattlerArt() {
  return PET_DEFINITIONS.filter((pet) => pet.hasBattlerArt);
}

/**
 * Create a runtime pet instance from a roster definition.
 * Used by battle, shop preview, and team management.
 */
export function createPetInstance(petId, options = {}) {
  const definition = getPetDefinition(petId);

  if (!definition) {
    throw new Error(`Unknown pet id: ${petId}`);
  }

  const level = options.level ?? 1;
  const attackBonus = options.attackBonus ?? 0;
  const healthBonus = options.healthBonus ?? 0;
  const levelBonus = level - 1;

  const attack = definition.attack + attackBonus + levelBonus;
  const health = definition.health + healthBonus + levelBonus;

  return {
    id: definition.id,
    name: definition.name,
    tier: definition.tier,
    level,
    upgrades: options.upgrades ?? 0,
    attack,
    health,
    hp: health,
    maxHp: health,
    shopCost: options.shopCost ?? getShopCostForTier(definition.tier),
    ability: { ...definition.ability },
    color: definition.color,
    hasBattlerArt: definition.hasBattlerArt,
  };
}

export function petsCanMerge(petA, petB) {
  return Boolean(petA && petB && petA.id === petB.id);
}

export function applyPetUpgrade(pet) {
  const nextHealth = (pet.health ?? pet.hp ?? 0) + 1;
  const nextMaxHp = (pet.maxHp ?? pet.health ?? pet.hp ?? 0) + 1;

  return {
    ...pet,
    upgrades: (pet.upgrades ?? 0) + 1,
    attack: pet.attack + 1,
    health: nextHealth,
    hp: (pet.hp ?? pet.health ?? 0) + 1,
    maxHp: nextMaxHp,
  };
}

export function createTeamFromPetIds(petIds) {
  return petIds.map((petId) => createPetInstance(petId));
}

export function pickRandomTier1PetIds(count) {
  const pool = getPetsByTier(1).map((pet) => pet.id);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

export function createRandomTier1Team(slotCount) {
  return createTeamFromPetIds(pickRandomTier1PetIds(slotCount));
}
