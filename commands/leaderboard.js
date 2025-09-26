import Player from "../models/Player.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { resolveWealthTier } from "../constants/wealthTiers.js";
import logger from "../utils/logger.js";

const leaderboardLogger = logger.child("Command:Leaderboard");

function formatLeaderboardEntry(rank, username, coins, tier) {
  return `${rank}. ${username} — ${coins} coins ${tier.emoji}`;
}

export default {
  name: "leaderboard",
  description: "View the top adventurers by coin balance.",
  slashCommandData: {
    name: "leaderboard",
    description: "View the top adventurers by coin balance.",
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;
    const client = isInteraction ? messageOrInteraction.client : messageOrInteraction.client;

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.questChannelId) {
      const embed = createCommandEmbed("leaderboard", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    const topPlayers = await Player.findAll({
      order: [["coins", "DESC"]],
      limit: 10,
    });

    if (!topPlayers.length) {
      const embed = createCommandEmbed("leaderboard", {
        color: EMBED_COLORS.neutral,
        title: "🏆 Adventurer Leaderboard",
        description: "No adventurers have earned coins yet. Be the first!",
      });

      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    let topUser = null;
    const entries = await Promise.all(
      topPlayers.map(async (player, index) => {
        const tier = resolveWealthTier(player.coins);
        let username;
        try {
          const user = await client.users.fetch(player.userId);
          username = user.username;
          if (index === 0) topUser = user;
        } catch (error) {
          username = `User ${player.userId}`;
          leaderboardLogger.warn(`Failed to fetch user ${player.userId}:`, error);
        }
        return formatLeaderboardEntry(index + 1, username, player.coins, tier);
      }),
    );

    leaderboardLogger.debug(`Leaderboard requested: ${entries.length} entries`);

    const embed = createCommandEmbed("leaderboard", {
      color: EMBED_COLORS.primary,
      title: "🏆 Adventurer Leaderboard",
      description: "The wealthiest adventurers in the realm:",
      thumbnail: topUser ? topUser.displayAvatarURL({ dynamic: true, size: 128 }) : undefined,
      fields: [
        {
          name: "Top Adventurers",
          value: entries.join("\n"),
        },
      ],
      timestamp: true,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
