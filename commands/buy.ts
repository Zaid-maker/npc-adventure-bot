import {
  type Message,
  type ChatInputCommandInteraction,
  type User,
  SlashCommandBuilder,
} from "discord.js";
import Player from "../models/Player.js";
import PlayerInventory from "../models/PlayerInventory.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { getShopItemByName, type ShopItem } from "../constants/shopItems.js";

export default {
  name: "buy",
  description: "Purchase an item from the shop.",
  slashCommandData: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase an item from the shop.")
    .addStringOption((option) =>
      option.setName("item").setDescription("The item you want to buy").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("quantity")
        .setDescription("How many to buy (default: 1)")
        .setRequired(false)
        .setMinValue(1),
    )
    .toJSON(),
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;

    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;

    // Parse arguments
    let itemName: string;
    let quantity = 1;

    if (isInteraction) {
      const interaction = messageOrInteraction as ChatInputCommandInteraction;
      itemName = interaction.options.getString("item", true);
      quantity = interaction.options.getInteger("quantity") || 1;
    } else {
      const message = messageOrInteraction as Message;
      const args = message.content.split(/\s+/).slice(1);

      if (args.length === 0) {
        const embed = createCommandEmbed("buy", {
          color: EMBED_COLORS.warning,
          title: "Missing Item Name",
          description:
            "Please specify an item to buy!\n\n**Usage:** `!buy <item_name> [quantity]`\n**Example:** `!buy lucky coin` or `!buy xp potion 3`",
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      // Check if last argument is a number (quantity)
      const lastArg = args[args.length - 1];
      if (lastArg && !isNaN(Number(lastArg))) {
        quantity = parseInt(lastArg);
        itemName = args.slice(0, -1).join(" ");
      } else {
        itemName = args.join(" ");
      }
    }

    // Find the item
    const item = getShopItemByName(itemName);
    if (!item) {
      const embed = createCommandEmbed("buy", {
        color: EMBED_COLORS.danger,
        title: "Item Not Found",
        description: `Couldn't find an item called **${itemName}**.\n\nUse \`!shop\` to see all available items.`,
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    // Permanent items can only be bought once
    if (item.type === "permanent") {
      const existingItem = await PlayerInventory.findOne({
        where: { userId: user.id, itemId: item.itemId },
      });

      if (existingItem) {
        const embed = createCommandEmbed("buy", {
          color: EMBED_COLORS.warning,
          title: "Already Owned",
          description: `You already own **${item.name}**! This is a permanent item and can only be purchased once.`,
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      quantity = 1; // Force quantity to 1 for permanent items
    }

    // Get player
    const [player] = await Player.findOrCreate({
      where: { userId: user.id },
      defaults: { coins: 0, streak: 0 },
    });

    const playerData = player as any;
    const totalCost = item.price * quantity;

    // Check if player has enough coins
    if (playerData.coins < totalCost) {
      const embed = createCommandEmbed("buy", {
        color: EMBED_COLORS.danger,
        title: "Insufficient Coins",
        description: `You need **${totalCost} coins** to buy ${quantity}x **${item.name}**, but you only have **${playerData.coins} coins**.`,
        fields: [
          {
            name: "Short by",
            value: `${totalCost - playerData.coins} coins`,
            inline: true,
          },
        ],
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    // Process purchase
    playerData.coins -= totalCost;
    await playerData.save();

    // Add to inventory
    const [inventoryItem, created] = await PlayerInventory.findOrCreate({
      where: { userId: user.id, itemId: item.itemId },
      defaults: { quantity },
    });

    if (!created) {
      const invData = inventoryItem as any;
      invData.quantity += quantity;
      await invData.save();
    }

    // Success message
    const embed = createCommandEmbed("buy", {
      color: EMBED_COLORS.success,
      title: "✅ Purchase Successful!",
      description: `You've purchased ${quantity}x ${item.emoji} **${item.name}**!`,
      fields: [
        {
          name: "Cost",
          value: `${totalCost} coins`,
          inline: true,
        },
        {
          name: "Remaining Balance",
          value: `${playerData.coins} coins`,
          inline: true,
        },
        {
          name: "Item Description",
          value: item.description,
          inline: false,
        },
      ],
      footer: "View your items with !inventory",
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
