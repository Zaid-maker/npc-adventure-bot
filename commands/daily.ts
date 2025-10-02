import { type Message, type ChatInputCommandInteraction, type User } from "discord.js";
import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

const BASE_DAILY_REWARD = 50;
const STREAK_MULTIPLIER = 5;

export default {
  name: "daily",
  description: "Claim your daily coin reward. Streak bonuses apply!",
  slashCommandData: {
    name: "daily",
    description: "Claim your daily coin reward. Streak bonuses apply!",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;

    // Find or create player
    const [player] = await Player.findOrCreate({
      where: { userId: user.id },
      defaults: { coins: 0, streak: 0 },
    });

    const playerData = player as any;
    const now = new Date();
    const lastClaim = playerData.lastDailyClaimAt ? new Date(playerData.lastDailyClaimAt) : null;

    // Check if user has already claimed today
    if (lastClaim) {
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastClaim < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
        const minutesRemaining = Math.ceil((24 - hoursSinceLastClaim) * 60) % 60;

        const embed = createCommandEmbed("daily", {
          color: EMBED_COLORS.warning,
          title: "⏰ Daily Reward Already Claimed",
          description: `You've already claimed your daily reward today, **${user.username}**!`,
          fields: [
            {
              name: "Next Claim Available",
              value:
                hoursRemaining > 0
                  ? `in ${hoursRemaining}h ${minutesRemaining}m`
                  : `in ${minutesRemaining}m`,
              inline: true,
            },
            {
              name: "Current Balance",
              value: `${playerData.coins} coins`,
              inline: true,
            },
          ],
        });

        await messageOrInteraction.reply({ embeds: [embed] });
        return;
      }
    }

    // Calculate reward
    const streakBonus = playerData.streak * STREAK_MULTIPLIER;
    const totalReward = BASE_DAILY_REWARD + streakBonus;

    // Update player
    playerData.coins += totalReward;
    playerData.lastDailyClaimAt = now;
    await playerData.save();

    // Create response embed
    const embed = createCommandEmbed("daily", {
      color: EMBED_COLORS.success,
      title: "🎁 Daily Reward Claimed!",
      description: `Welcome back, **${user.username}**! Here's your daily reward.`,
      fields: [
        {
          name: "💰 Base Reward",
          value: `${BASE_DAILY_REWARD} coins`,
          inline: true,
        },
        {
          name: "🔥 Streak Bonus",
          value:
            playerData.streak > 0
              ? `+${streakBonus} coins (${playerData.streak} day streak)`
              : "No active streak",
          inline: true,
        },
        {
          name: "Total Earned",
          value: `**${totalReward} coins**`,
          inline: true,
        },
        {
          name: "💎 New Balance",
          value: `${playerData.coins} coins`,
          inline: true,
        },
      ],
      footer: "Come back tomorrow for another reward!",
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
