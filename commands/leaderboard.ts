import { Message, ChatInputCommandInteraction, User } from "discord.js";
import Player from "../models/Player.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { resolveWealthTier } from "../constants/wealthTiers.js";
import logger from "../utils/logger.js";

const leaderboardLogger = logger.child("Command:Leaderboard");

function formatLeaderboardEntry(rank: number, username: string, coins: number, tier: { emoji: string }): string {
  return `${rank}. ${username} — ${coins} coins ${tier.emoji}`;
}

export default {
  name: "leaderboard",
  description: "View the top adventurers by coin balance.",
  slashCommandData: {
    name: "leaderboard",
    description: "View the top adventurers by coin balance.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction = (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;
    const client = isInteraction ? messageOrInteraction.client : messageOrInteraction.client;

    const settings = await GuildSettings.findOne({ where: { guildId: guild!.id } });
    const settingsData = settings as any;
    if (!settings || !settingsData.questChannelId) {
      const embed = createCommandEmbed("leaderboard", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
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

    let topUser: User | null = null;
    const entries: string[] = [];
    
    for (let index = 0; index < topPlayers.length; index++) {
      const player = topPlayers[index];
      const playerData = player as any;
      const tier = resolveWealthTier(playerData.coins);
      let username: string;
      try {
        const user = await client.users.fetch(playerData.userId);
        username = user.username;
        if (index === 0) topUser = user;
      } catch (error) {
        username = `User ${playerData.userId}`;
        leaderboardLogger.warn(`Failed to fetch user ${playerData.userId}:`, error);
      }
      entries.push(formatLeaderboardEntry(index + 1, username, playerData.coins, tier!));
    }

    leaderboardLogger.debug(`Leaderboard requested: ${entries.length} entries`);

    const embed = createCommandEmbed("leaderboard", {
      color: EMBED_COLORS.primary,
      title: "🏆 Adventurer Leaderboard",
      description: "The wealthiest adventurers in the realm:",
      thumbnail: topUser ? topUser.displayAvatarURL({ size: 128 }) : undefined,
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