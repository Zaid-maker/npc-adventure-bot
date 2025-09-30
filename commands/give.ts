import { Message, ChatInputCommandInteraction, User, GuildMember } from "discord.js";
import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const giveLogger = logger.child("Command:Give");

export default {
  name: "give",
  description:
    "Give coins to server members (Bot Owner Only) - Includes reason tracking and large transfer warnings",
  slashCommandData: {
    name: "give",
    description: "Give coins to server members (Bot Owner Only)",
    options: [
      {
        name: "user",
        description: "The server member to give coins to",
        type: 6, // USER type
        required: true,
      },
      {
        name: "amount",
        description: "Amount of coins to give (1-10,000)",
        type: 4, // INTEGER type
        required: true,
        min_value: 1,
        max_value: 10000,
      },
      {
        name: "reason",
        description: "Reason for giving coins (for transparency)",
        type: 3, // STRING type
        required: false,
      },
    ],
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    // Check if user is bot owner
    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      giveLogger.error("OWNER_ID not set in environment variables");
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.danger,
        title: "❌ Configuration Error",
        description: "Bot owner ID is not configured.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    if (user.id !== ownerId) {
      giveLogger.warn(`Unauthorized give attempt by user ${user.id} (${user.username})`);
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.danger,
        title: "❌ Access Denied",
        description: "This command is restricted to the bot owner only.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    try {
      // Get target user
      const targetUser = isInteraction
        ? (messageOrInteraction as ChatInputCommandInteraction).options.getUser("user")
        : (messageOrInteraction as Message).mentions.users.first();

      if (!targetUser) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid User",
          description: "Please specify a valid user to give coins to.",
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      if (targetUser.id === user.id) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid Target",
          description: "You cannot give coins to yourself.",
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      if (targetUser.bot) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid Target",
          description: "You cannot give coins to bots.",
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      // Double-check target user is still a member (in case they left during execution)
      const targetMemberCheck = await guild!.members.fetch(targetUser.id).catch(() => null);
      if (!targetMemberCheck) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ User Left Server",
          description: "The target user is no longer a member of this server.",
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      // Get amount
      const amount = isInteraction
        ? (messageOrInteraction as ChatInputCommandInteraction).options.getInteger("amount")
        : parseInt((messageOrInteraction as Message).content.split(" ")[2] || "0");

      if (!amount || amount < 1 || amount > 10000) {
        const embed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Invalid Amount",
          description: "Please specify an amount between 1 and 10,000 coins.",
        });
        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }

      // Get or create target player first for balance check
      const [targetPlayer] = await Player.findOrCreate({
        where: { userId: targetUser.id },
        defaults: { coins: 0, streak: 0 },
      });
      const targetPlayerData = targetPlayer as any;

      // Check daily limit (50,000 coins per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // This is a simplified check - in production you'd want to track this in database
      // For now, we'll just warn about large amounts
      const DAILY_LIMIT = 50000;
      if (amount > 5000) {
        const confirmEmbed = createCommandEmbed("give", {
          color: EMBED_COLORS.warning,
          title: "⚠️ Large Transfer Warning",
          description: `You're about to give **${amount} coins** to ${targetUser.username}.\n\nThis is a large amount. Are you sure?`,
          fields: [
            {
              name: "Recipient",
              value: `${targetUser.username}`,
              inline: true,
            },
            {
              name: "Amount",
              value: `${amount} 🪙`,
              inline: true,
            },
            {
              name: "Current Balance",
              value: `${targetPlayerData.coins} 🪙`,
              inline: true,
            },
          ],
          footer: { text: "This action cannot be undone" },
        });

        // For slash commands, we'll proceed (Discord doesn't support confirmations easily)
        // For prefix commands, we could add confirmation logic
        if (!isInteraction) {
          await messageOrInteraction.reply({ embeds: [confirmEmbed] });
          return; // Require explicit confirmation for large amounts in prefix commands
        }
      }

      // Get reason (optional)
      const reason = isInteraction
        ? (messageOrInteraction as ChatInputCommandInteraction).options.getString("reason")
        : (messageOrInteraction as Message).content.split(" ").slice(3).join(" ") || null;

      // Add coins
      const oldBalance = targetPlayerData.coins;
      targetPlayerData.coins += amount;
      await targetPlayer.save();

      giveLogger.info(
        `Owner ${user.username} gave ${amount} coins to ${targetUser.username} (${oldBalance} → ${targetPlayerData.coins})${reason ? ` - Reason: ${reason}` : ""}`,
      );

      // Create success embed
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.success,
        title: "✅ Coins Given Successfully",
        fields: [
          {
            name: "👤 Recipient",
            value: `${targetUser.username}\n${targetUser}`,
            inline: true,
          },
          {
            name: "🪙 Amount Given",
            value: `${amount.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: "💰 Balance Change",
            value: `${oldBalance.toLocaleString()} → ${targetPlayerData.coins.toLocaleString()}`,
            inline: true,
          },
          ...(reason
            ? [
                {
                  name: "📝 Reason",
                  value: reason,
                  inline: false,
                },
              ]
            : []),
        ],
        footer: { text: `Admin action by ${user.username} • ${guild!.name}` },
        timestamp: true,
      });

      await messageOrInteraction.reply({ embeds: [embed] });
    } catch (error) {
      giveLogger.error("Error executing give command:", error);
      const embed = createCommandEmbed("give", {
        color: EMBED_COLORS.danger,
        title: "❌ Error",
        description: "There was an error while giving coins. Please try again later.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
    }
  },
};
