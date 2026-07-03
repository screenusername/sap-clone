import { createItemOffer, getAllItemDefinitions } from "./items.js";

const BASIC_ITEM_IDS = ["apple", "honey", "salad", "melon"];

/**
 * Fixed basic item lineup available every shop visit.
 */
export function rollItemOffers() {
  return BASIC_ITEM_IDS.map((itemId) => createItemOffer(itemId));
}

export function getItemShopPool() {
  return getAllItemDefinitions();
}
