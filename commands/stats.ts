import { type Message, type ChatInputCommandInteraction, type User } from "discord.js";
import Player from "../models/Player.js";
import QuestProgress from "../models/QuestProgress.js";
import { getQuestWithProgress } from "../services/questService.js";
import { getTotalGuildCount, getTotalMemberCount } from "../utils/shardingUtils.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";
import client from "../config/discordClient.js";

const statsLogger = logger.child("Command:Stats");

function formatLastTurnIn(lastCompletedAt: Date | null): string {
  if (!lastCompletedAt) {
    return "No turn-ins yet.";
  }

  const date = lastCompletedAt instanceof Date ? lastCompletedAt : new Date(lastCompletedAt);
  const epochSeconds = Math.floor(date.getTime() / 1000);

  return `<t:${epochSeconds}:R>`;
}

function formatActiveQuest(quest: any, progress: any): string {
  if (!quest) {
    return "No daily quest is active right now.";
  }

  const lines = [`**${quest.name}**`];

  if (progress) {
    if (progress.completed) {
      lines.push(
        progress.claimed ? "Status: Reward claimed ✅" : "Status: Complete! Claim your reward.",
      );
    } else {
      lines.push(`Progress: ${progress.progress}`);
    }
  } else {
    lines.push("Progress: Not started");
  }

  lines.push(`Reward: ${quest.rewardCoins} coins`);

  return lines.join("\n");
}

export default {
  name: "stats",
  description: "See your overall adventurer stats.",
  slashCommandData: {
    name: "stats",
    description: "See your overall adventurer stats.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;

    const userId = user.id;

    const [player] = await Player.findOrCreate({
      where: { userId },
      defaults: { coins: 0, streak: 0 },
    });

    const [completedCount, claimedCount] = await Promise.all([
      QuestProgress.count({ where: { userId, completed: true } }),
      QuestProgress.count({ where: { userId, claimed: true } }),
    ]);

    const { quest, progress } = await getQuestWithProgress(userId);

    // Get global bot statistics if sharding is enabled
    const [totalGuilds, totalMembers] = await Promise.all([
      getTotalGuildCount(client),
      getTotalMemberCount(client),
    ]);

    statsLogger.debug(
      `Profile lookup for ${user.tag}: coins=${(player as any).coins}, streak=${(player as any).streak}, completed=${completedCount}, claimed=${claimedCount}`,
    );

    const fields = [
      {
        name: "Coin Pouch",
        value: `${(player as any).coins} coins`,
        inline: true,
      },
      {
        name: "Daily Streak",
        value: (player as any).streak
          ? `${(player as any).streak} day${(player as any).streak === 1 ? "" : "s"} 🔥`
          : "No active streak",
        inline: true,
      },
      {
        name: "Quest History",
        value:
          completedCount > 0
            ? `${completedCount} completed\n${claimedCount} rewards claimed`
            : "No quests completed yet.",
        inline: true,
      },
      {
        name: "Last Turn-In",
        value: formatLastTurnIn((player as any).lastCompletedAt),
        inline: true,
      },
      {
        name: "Today's Quest",
        value: formatActiveQuest(quest, progress),
      },
    ];

    // Add global statistics if sharding is enabled
    if (client.shard) {
      fields.splice(3, 0, {
        name: "🌐 Bot Statistics",
        value: `${totalGuilds.toLocaleString()} servers\n${totalMembers.toLocaleString()} members`,
        inline: true,
      });
    }

    const embed = createCommandEmbed("stats", {
      color: EMBED_COLORS.primary,
      title: "🧭 Adventurer Profile",
      description: `Here\'s where you stand, **${user.username}**.`,
      fields,
      timestamp: true,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
