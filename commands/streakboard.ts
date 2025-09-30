import { Message, ChatInputCommandInteraction, User } from "discord.js";
import Player from "../models/Player.js";
import { Op } from "sequelize";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { resolveStreakTier } from "../constants/streakTiers.js";
import logger from "../utils/logger.js";

const streakboardLogger = logger.child("Command:Streakboard");

function formatStreakboardEntry(
  rank: number,
  username: string,
  streak: number,
  tier: { emoji: string },
): string {
  return `${rank}. ${username} — ${streak} day${streak === 1 ? "" : "s"} ${tier.emoji}`;
}

export default {
  name: "streakboard",
  description: "View the top adventurers by daily quest streaks.",
  slashCommandData: {
    name: "streakboard",
    description: "View the top adventurers by daily quest streaks.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;
    const client = isInteraction ? messageOrInteraction.client : messageOrInteraction.client;

    const topPlayers = await Player.findAll({
      where: { streak: { [Op.gt]: 0 } },
      order: [["streak", "DESC"]],
      limit: 10,
    });

    if (!topPlayers.length) {
      const embed = createCommandEmbed("streakboard", {
        color: EMBED_COLORS.neutral,
        title: "🔥 Streak Leaderboard",
        description: "No adventurers have active streaks yet. Complete today's quest to start one!",
      });

      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    let topUser: User | null = null;
    const entries: string[] = [];

    for (let index = 0; index < topPlayers.length; index++) {
      const player = topPlayers[index];
      const playerData = player as any;
      const tier = resolveStreakTier(playerData.streak);
      let username: string;
      try {
        const user = await client.users.fetch(playerData.userId);
        username = user.username;
        if (index === 0) topUser = user;
      } catch (error) {
        username = `User ${playerData.userId}`;
        streakboardLogger.warn(`Failed to fetch user ${playerData.userId}:`, error);
      }
      entries.push(formatStreakboardEntry(index + 1, username, playerData.streak, tier!));
    }

    streakboardLogger.debug(`Streakboard requested: ${entries.length} entries`);

    const embed = createCommandEmbed("streakboard", {
      color: EMBED_COLORS.primary,
      title: "🔥 Streak Leaderboard",
      description: "The most dedicated adventurers in the realm:",
      thumbnail: topUser ? topUser.displayAvatarURL({ size: 128 }) : undefined,
      fields: [
        {
          name: "Top Streakers",
          value: entries.join("\n"),
        },
      ],
      timestamp: true,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
