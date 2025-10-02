import { type Message, type ChatInputCommandInteraction } from "discord.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { SHOP_ITEMS, type ShopItem } from "../constants/shopItems.js";

export default {
  name: "shop",
  description: "Browse the adventurer's shop for items and boosts.",
  slashCommandData: {
    name: "shop",
    description: "Browse the adventurer's shop for items and boosts.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    // Group items by category
    const categories = {
      boost: SHOP_ITEMS.filter((item) => item.category === "boost"),
      utility: SHOP_ITEMS.filter((item) => item.category === "utility"),
      cosmetic: SHOP_ITEMS.filter((item) => item.category === "cosmetic"),
    };

    const formatItem = (item: ShopItem) =>
      `${item.emoji} **${item.name}** — ${item.price} coins\n*${item.description}*\n${item.type === "permanent" ? "✨ Permanent" : "📦 Consumable"}`;

    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (categories.boost.length > 0) {
      fields.push({
        name: "💎 Boosts & Potions",
        value: categories.boost.map(formatItem).join("\n\n"),
        inline: false,
      });
    }

    if (categories.utility.length > 0) {
      fields.push({
        name: "🛠️ Utility Items",
        value: categories.utility.map(formatItem).join("\n\n"),
        inline: false,
      });
    }

    if (categories.cosmetic.length > 0) {
      fields.push({
        name: "✨ Cosmetic Items",
        value: categories.cosmetic.map(formatItem).join("\n\n"),
        inline: false,
      });
    }

    const embed = createCommandEmbed("shop", {
      color: EMBED_COLORS.primary,
      title: "🏪 Adventurer's Shop",
      description:
        "Welcome to the shop! Purchase items to enhance your adventure.\n\n**How to buy:** Use `!buy <item_name>` or `/buy <item_name>`",
      fields,
      footer: "Check your balance with !balance • View inventory with !inventory",
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
