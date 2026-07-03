import { getPetsByTier, getPetsWithBattlerArt } from "../data/pets.js";

export const BATTLER_TEXTURE_KEYS = getPetsWithBattlerArt().map((pet) => pet.id);

export const TIER1_BATTLER_TEXTURE_KEYS = getPetsByTier(1)
  .filter((pet) => pet.hasBattlerArt)
  .map((pet) => pet.id);

export const PET_PORTRAIT_ASPECT_WIDTH = 5;
export const PET_PORTRAIT_ASPECT_HEIGHT = 7.6;

export const PET_PORTRAIT_MAX_WIDTH = 168;
export const PET_PORTRAIT_MAX_HEIGHT =
  PET_PORTRAIT_MAX_WIDTH * (PET_PORTRAIT_ASPECT_HEIGHT / PET_PORTRAIT_ASPECT_WIDTH);

export function getBattlerTextureKey(petNameOrId) {
  return petNameOrId.toLowerCase();
}

export function getBattlerAssetPath(petNameOrId) {
  return `assets/battlers/${getBattlerTextureKey(petNameOrId)}.png`;
}
