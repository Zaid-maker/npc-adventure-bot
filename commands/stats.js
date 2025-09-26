import Player from "../models/Player.js";
import QuestProgress from "../models/QuestProgress.js";
import { getQuestWithProgress } from "../services/questService.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const statsLogger = logger.child("Command:Stats");

function formatLastTurnIn(lastCompletedAt) {
  if (!lastCompletedAt) {
    return "No turn-ins yet.";
  }

  const date = lastCompletedAt instanceof Date ? lastCompletedAt : new Date(lastCompletedAt);
  const epochSeconds = Math.floor(date.getTime() / 1000);

  return `<t:${epochSeconds}:R>`;
}

function formatActiveQuest(quest, progress) {
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
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;

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

    statsLogger.debug(
      `Profile lookup for ${user.tag}: coins=${player.coins}, streak=${player.streak}, completed=${completedCount}, claimed=${claimedCount}`,
    );

    const embed = createCommandEmbed("stats", {
      color: EMBED_COLORS.primary,
      title: "🧭 Adventurer Profile",
      description: `Here\'s where you stand, **${user.username}**.`,
      fields: [
        {
          name: "Coin Pouch",
          value: `${player.coins} coins`,
          inline: true,
        },
        {
          name: "Daily Streak",
          value: player.streak
            ? `${player.streak} day${player.streak === 1 ? "" : "s"} 🔥`
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
          value: formatLastTurnIn(player.lastCompletedAt),
          inline: true,
        },
        {
          name: "Today's Quest",
          value: formatActiveQuest(quest, progress),
        },
      ],
      timestamp: true,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
