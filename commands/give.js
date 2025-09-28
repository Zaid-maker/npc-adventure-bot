import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const giveLogger = logger.child("Command:Give");

export default {
  name: "give",
  description: "Give coins to another user (Bot Owner Only)",
  slashCommandData: {
    name: "give",
    description: "Give coins to another user (Bot Owner Only)",
    options: [
      {
        name: "user",
        description: "The user to give coins to",
        type: 6, // USER type
        required: true,
      },
      {
        name: "amount",
        description: "Amount of coins to give",
        type: 4, // INTEGER type
        required: true,
        min_value: 1,
        max_value: 10000,
      },
    ],
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    // Check if user is bot owner
    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      giveLogger.error("OWNER_ID not set in environment variables");
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.error,
        title: "❌ Configuration Error",
        description: "Bot owner ID is not configured.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    if (user.id !== ownerId) {
      giveLogger.warn(`Unauthorized give attempt by user ${user.id} (${user.username})`);
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.error,
        title: "❌ Access Denied",
        description: "This command is restricted to the bot owner only.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    try {
      // Get target user
      const targetUser = isInteraction
        ? messageOrInteraction.options.getUser("user")
        : messageOrInteraction.mentions.users.first();

      if (!targetUser) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid User",
          description: "Please specify a valid user to give coins to.",
        });
        return messageOrInteraction.reply({ embeds: [embed] });
      }

      if (targetUser.id === user.id) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid Target",
          description: "You cannot give coins to yourself.",
        });
        return messageOrInteraction.reply({ embeds: [embed] });
      }

      if (targetUser.bot) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid Target",
          description: "You cannot give coins to bots.",
        });
        return messageOrInteraction.reply({ embeds: [embed] });
      }

      // Check if target user is a member of this server
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ User Not in Server",
          description: "You can only give coins to users who are members of this server.",
        });
        return messageOrInteraction.reply({ embeds: [embed] });
      }

      // Get amount
      const amount = isInteraction
        ? messageOrInteraction.options.getInteger("amount")
        : parseInt(messageOrInteraction.content.split(" ")[2]);

      if (!amount || amount < 1 || amount > 10000) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid Amount",
          description: "Please specify an amount between 1 and 10,000 coins.",
        });
        return messageOrInteraction.reply({ embeds: [embed] });
      }

      // Get or create target player
      const [targetPlayer] = await Player.findOrCreate({
        where: { userId: targetUser.id },
        defaults: { coins: 0, streak: 0 },
      });

      // Add coins
      const oldBalance = targetPlayer.coins;
      targetPlayer.coins += amount;
      await targetPlayer.save();

      giveLogger.info(
        `Owner ${user.username} gave ${amount} coins to ${targetUser.username} (${oldBalance} → ${targetPlayer.coins})`,
      );

      // Create success embed
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.success,
        title: "✅ Coins Given Successfully",
        fields: [
          {
            name: "Recipient",
            value: `${targetUser.username} (${targetUser.id})`,
            inline: true,
          },
          {
            name: "Amount Given",
            value: `${amount} 🪙`,
            inline: true,
          },
          {
            name: "New Balance",
            value: `${targetPlayer.coins} 🪙`,
            inline: true,
          },
        ],
        footer: { text: "Admin action performed by bot owner" },
        timestamp: true,
      });

      await messageOrInteraction.reply({ embeds: [embed] });
    } catch (error) {
      giveLogger.error("Error executing give command:", error);
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.error,
        title: "❌ Error",
        description: "There was an error while giving coins. Please try again later.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
    }
  },
};
