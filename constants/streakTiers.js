export const STREAK_TIERS = [
  { min: 0, name: "Just starting out", emoji: "✨" },
  { min: 3, name: "On fire", emoji: "🔥" },
  { min: 7, name: "Unstoppable", emoji: "⚡" },
  { min: 14, name: "Legendary", emoji: "🌟" },
  { min: 30, name: "Mythic streak", emoji: "🌈" },
];

export function resolveStreakTier(streak) {
  let currentTier = STREAK_TIERS[0];

  for (const tier of STREAK_TIERS) {
    if (streak >= tier.min) {
      currentTier = tier;
    } else {
      break;
    }
  }

  return currentTier;
}
