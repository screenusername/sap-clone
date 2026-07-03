/**
 * Basic shop items that permanently buff a battler's stats.
 * Drag an item onto a team member to apply its effect.
 */
export const ITEM_DEFINITIONS = [
  {
    id: "apple",
    name: "Apple",
    cost: 3,
    icon: "🍎",
    color: 0xe03131,
    description: "+1 health",
    effect: { health: 1 },
  },
  {
    id: "honey",
    name: "Honey",
    cost: 3,
    icon: "🍯",
    color: 0xfcc419,
    description: "+1 attack",
    effect: { attack: 1 },
  },
  {
    id: "salad",
    name: "Salad",
    cost: 4,
    icon: "🥗",
    color: 0x51cf66,
    description: "+1 attack, +1 health",
    effect: { attack: 1, health: 1 },
  },
  {
    id: "melon",
    name: "Melon",
    cost: 3,
    icon: "🍉",
    color: 0xff8787,
    description: "+2 health",
    effect: { health: 2 },
  },
];

const ITEM_BY_ID = new Map(ITEM_DEFINITIONS.map((item) => [item.id, item]));

export function getItemDefinition(itemId) {
  return ITEM_BY_ID.get(itemId) ?? null;
}

export function getAllItemDefinitions() {
  return [...ITEM_DEFINITIONS];
}

export function createItemOffer(itemId) {
  const definition = getItemDefinition(itemId);

  if (!definition) {
    throw new Error(`Unknown item id: ${itemId}`);
  }

  return {
    id: definition.id,
    name: definition.name,
    cost: definition.cost,
    icon: definition.icon,
    color: definition.color,
    description: definition.description,
    effect: { ...definition.effect },
  };
}

export function applyItemToPet(pet, item) {
  const definition = getItemDefinition(item.id) ?? item;
  const attackBonus = definition.effect?.attack ?? 0;
  const healthBonus = definition.effect?.health ?? 0;
  const currentHealth = pet.health ?? pet.hp ?? 0;
  const currentHp = pet.hp ?? pet.health ?? 0;
  const currentMaxHp = pet.maxHp ?? currentHealth;

  return {
    ...pet,
    attack: pet.attack + attackBonus,
    health: currentHealth + healthBonus,
    hp: currentHp + healthBonus,
    maxHp: currentMaxHp + healthBonus,
    items: [...(pet.items ?? []), definition.id],
  };
}
