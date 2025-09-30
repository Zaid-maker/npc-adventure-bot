interface WealthTier {
  min: number;
  name: string;
  emoji: string;
}

export const WEALTH_TIERS: WealthTier[] = [
  { min: 0, name: "Torchlit Wanderer", emoji: "🕯️" },
  { min: 75, name: "Road-Worn Traveler", emoji: "🧳" },
  { min: 250, name: "Seasoned Adventurer", emoji: "🛡️" },
  { min: 600, name: "Gilded Champion", emoji: "💎" },
  { min: 1500, name: "Realm Tycoon", emoji: "👑" },
  { min: 5000, name: "Dragonhoard Magnate", emoji: "🐉" },
];

export function resolveWealthTier(coins: number): WealthTier {
  let currentTier = WEALTH_TIERS[0]!;

  for (const tier of WEALTH_TIERS) {
    if (coins >= tier.min) {
      currentTier = tier;
    } else {
      break;
    }
  }

  return currentTier;
}