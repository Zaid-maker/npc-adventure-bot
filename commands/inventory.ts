import { type Message, type ChatInputCommandInteraction, type User } from "discord.js";
import PlayerInventory from "../models/PlayerInventory.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { getShopItem } from "../constants/shopItems.js";

export default {
  name: "inventory",
  aliases: ["inv"],
  description: "View your inventory of purchased items.",
  slashCommandData: {
    name: "inventory",
    description: "View your inventory of purchased items.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;

    // Get all items for this player
    const inventory = await PlayerInventory.findAll({
      where: { userId: user.id },
    });

    if (!inventory || inventory.length === 0) {
      const embed = createCommandEmbed("inventory", {
        color: EMBED_COLORS.neutral,
        title: "🎒 Empty Inventory",
        description:
          "Your inventory is empty! Visit the shop to purchase items.\n\nUse `!shop` to browse available items.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    // Group items by category
    const consumables: string[] = [];
    const permanents: string[] = [];

    for (const invItem of inventory) {
      const invData = invItem as any;
      const shopItem = getShopItem(invData.itemId);

      if (!shopItem) continue;

      const itemLine = `${shopItem.emoji} **${shopItem.name}** ${invData.quantity > 1 ? `x${invData.quantity}` : ""}`;

      if (shopItem.type === "consumable") {
        consumables.push(itemLine);
      } else {
        permanents.push(itemLine);
      }
    }

    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (consumables.length > 0) {
      fields.push({
        name: "📦 Consumable Items",
        value: consumables.join("\n"),
        inline: false,
      });
    }

    if (permanents.length > 0) {
      fields.push({
        name: "✨ Permanent Items",
        value: permanents.join("\n"),
        inline: false,
      });
    }

    const embed = createCommandEmbed("inventory", {
      color: EMBED_COLORS.primary,
      title: `🎒 ${user.username}'s Inventory`,
      description: `You have **${inventory.length}** unique item${inventory.length !== 1 ? "s" : ""} in your inventory.`,
      fields,
      footer: "Use items with !use <item_name> • Buy more with !shop",
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
