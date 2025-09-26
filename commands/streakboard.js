import Player from "../models/Player.js";
import { Op } from "sequelize";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { resolveStreakTier } from "../constants/streakTiers.js";
import logger from "../utils/logger.js";

const streakboardLogger = logger.child("Command:Streakboard");

function formatStreakboardEntry(rank, username, streak, tier) {
  return `${rank}. ${username} — ${streak} day${streak === 1 ? "" : "s"} ${tier.emoji}`;
}

export default {
  name: "streakboard",
  description: "View the top adventurers by daily quest streaks.",
  async execute(message) {
    const settings = await GuildSettings.findOne({ where: { guildId: message.guild.id } });
    if (!settings || !settings.questChannelId) {
      const embed = createCommandEmbed("streakboard", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      return message.reply({ embeds: [embed] });
    }

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

      await message.reply({ embeds: [embed] });
      return;
    }

    let topUser = null;
    const entries = await Promise.all(
      topPlayers.map(async (player, index) => {
        const tier = resolveStreakTier(player.streak);
        let username;
        try {
          const user = await message.client.users.fetch(player.userId);
          username = user.username;
          if (index === 0) topUser = user;
        } catch (error) {
          username = `User ${player.userId}`;
          streakboardLogger.warn(`Failed to fetch user ${player.userId}:`, error);
        }
        return formatStreakboardEntry(index + 1, username, player.streak, tier);
      }),
    );

    streakboardLogger.debug(`Streakboard requested: ${entries.length} entries`);

    const embed = createCommandEmbed("streakboard", {
      color: EMBED_COLORS.primary,
      title: "🔥 Streak Leaderboard",
      description: "The most dedicated adventurers in the realm:",
      thumbnail: topUser ? topUser.displayAvatarURL({ dynamic: true, size: 128 }) : undefined,
      fields: [
        {
          name: "Top Streakers",
          value: entries.join("\n"),
        },
      ],
      timestamp: true,
    });

    await message.reply({ embeds: [embed] });
  },
};
