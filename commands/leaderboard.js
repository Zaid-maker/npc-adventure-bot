import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { resolveWealthTier } from "../constants/wealthTiers.js";
import logger from "../utils/logger.js";

const leaderboardLogger = logger.child("Command:Leaderboard");

function formatLeaderboardEntry(rank, player, tier) {
  const username = player.userId; // Assuming userId is the Discord ID; in real use, fetch username if possible
  return `${rank}. ${username} — ${player.coins} coins ${tier.emoji}`;
}

export default {
  name: "leaderboard",
  description: "View the top adventurers by coin balance.",
  async execute(message) {
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

      await message.reply({ embeds: [embed] });
      return;
    }

    const entries = topPlayers.map((player, index) => {
      const tier = resolveWealthTier(player.coins);
      return formatLeaderboardEntry(index + 1, player, tier);
    });

    leaderboardLogger.debug(`Leaderboard requested: ${entries.length} entries`);

    const embed = createCommandEmbed("leaderboard", {
      color: EMBED_COLORS.primary,
      title: "🏆 Adventurer Leaderboard",
      description: "The wealthiest adventurers in the realm:",
      fields: [
        {
          name: "Top Adventurers",
          value: entries.join("\n"),
        },
      ],
      timestamp: true,
    });

    await message.reply({ embeds: [embed] });
  },
};
