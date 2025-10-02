export interface ShopItem {
  itemId: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  type: "consumable" | "permanent";
  category: "boost" | "utility" | "cosmetic";
  effects?: {
    type: string;
    value: number | string;
    duration?: number;
  };
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    itemId: "streak_freeze",
    name: "Streak Freeze",
    description: "Protects your streak for 1 day if you miss a quest. Use it before the day ends!",
    price: 200,
    emoji: "🧊",
    type: "consumable",
    category: "utility",
    effects: {
      type: "streak_protection",
      value: 1,
      duration: 1,
    },
  },
  {
    itemId: "coin_booster",
    name: "Coin Booster",
    description: "Doubles the coins from your next quest completion!",
    price: 150,
    emoji: "💎",
    type: "consumable",
    category: "boost",
    effects: {
      type: "coin_multiplier",
      value: 2,
      duration: 1,
    },
  },
  {
    itemId: "lucky_coin",
    name: "Lucky Coin",
    description: "Doubles your next daily reward! Feeling lucky?",
    price: 100,
    emoji: "🍀",
    type: "consumable",
    category: "boost",
    effects: {
      type: "daily_multiplier",
      value: 2,
      duration: 1,
    },
  },
  {
    itemId: "quest_reroll",
    name: "Quest Reroll",
    description: "Don't like today's quest? Reroll it for a new challenge!",
    price: 250,
    emoji: "🎲",
    type: "consumable",
    category: "utility",
    effects: {
      type: "quest_reroll",
      value: 1,
    },
  },
  {
    itemId: "adventurer_badge",
    name: "Adventurer's Badge",
    description: "A prestigious badge showing your dedication. Displays on your profile!",
    price: 500,
    emoji: "🏅",
    type: "permanent",
    category: "cosmetic",
  },
  {
    itemId: "legendary_title",
    name: "Legendary Title",
    description: "Unlock the 'Legendary Adventurer' title for your profile!",
    price: 1000,
    emoji: "👑",
    type: "permanent",
    category: "cosmetic",
  },
  {
    itemId: "xp_potion",
    name: "XP Potion",
    description: "Gain +50 bonus coins on your next quest completion!",
    price: 75,
    emoji: "⚗️",
    type: "consumable",
    category: "boost",
    effects: {
      type: "bonus_coins",
      value: 50,
      duration: 1,
    },
  },
];

export function getShopItem(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.itemId === itemId);
}

export function getShopItemByName(name: string): ShopItem | undefined {
  const lowerName = name.toLowerCase();
  return SHOP_ITEMS.find(
    (item) => item.name.toLowerCase() === lowerName || item.itemId.toLowerCase() === lowerName,
  );
}

export function getItemsByCategory(category: string): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.category === category);
}
