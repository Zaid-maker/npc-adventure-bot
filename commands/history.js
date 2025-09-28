import Player from "../models/Player.js";
import Quest from "../models/Quest.js";
import QuestProgress from "../models/QuestProgress.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";
import { Op } from "sequelize";

const historyLogger = logger.child("Command:History");

// Achievement definitions with progress tracking
const ACHIEVEMENTS = [
  {
    id: "first_quest",
    name: "First Steps",
    description: "Complete your first quest",
    requirement: (stats) => stats.totalQuests >= 1,
    progress: (stats) => Math.min(stats.totalQuests, 1),
    maxProgress: 1,
    emoji: "🎯",
  },
  {
    id: "quest_novice",
    name: "Quest Novice",
    description: "Complete 5 quests",
    requirement: (stats) => stats.totalQuests >= 5,
    progress: (stats) => Math.min(stats.totalQuests, 5),
    maxProgress: 5,
    emoji: "⚔️",
  },
  {
    id: "quest_veteran",
    name: "Quest Veteran",
    description: "Complete 25 quests",
    requirement: (stats) => stats.totalQuests >= 25,
    progress: (stats) => Math.min(stats.totalQuests, 25),
    maxProgress: 25,
    emoji: "🏆",
  },
  {
    id: "quest_master",
    name: "Quest Master",
    description: "Complete 50 quests",
    requirement: (stats) => stats.totalQuests >= 50,
    progress: (stats) => Math.min(stats.totalQuests, 50),
    maxProgress: 50,
    emoji: "👑",
  },
  {
    id: "wealthy",
    name: "Wealthy Adventurer",
    description: "Accumulate 500 coins",
    requirement: (stats) => stats.totalCoins >= 500,
    progress: (stats) => Math.min(stats.totalCoins, 500),
    maxProgress: 500,
    emoji: "💰",
  },
  {
    id: "rich",
    name: "Rich Adventurer",
    description: "Accumulate 1000 coins",
    requirement: (stats) => stats.totalCoins >= 1000,
    progress: (stats) => Math.min(stats.totalCoins, 1000),
    maxProgress: 1000,
    emoji: "💎",
  },
  {
    id: "dedicated",
    name: "Dedicated Adventurer",
    description: "Maintain a 7-day streak",
    requirement: (stats) => stats.maxStreak >= 7,
    progress: (stats) => Math.min(stats.maxStreak, 7),
    maxProgress: 7,
    emoji: "🔥",
  },
  {
    id: "legendary",
    name: "Legendary Adventurer",
    description: "Maintain a 30-day streak",
    requirement: (stats) => stats.maxStreak >= 30,
    progress: (stats) => Math.min(stats.maxStreak, 30),
    maxProgress: 30,
    emoji: "🌟",
  },
  {
    id: "speedrunner",
    name: "Speedrunner",
    description: "Complete 10 quests in one day",
    requirement: (stats) => stats.todayQuests >= 10,
    progress: (stats) => Math.min(stats.todayQuests, 10),
    maxProgress: 10,
    emoji: "⚡",
  },
];

// Title definitions based on achievements
const TITLES = [
  {
    name: "Novice Adventurer",
    requirement: (achievements) => achievements.includes("first_quest"),
    emoji: "🌱",
  },
  {
    name: "Experienced Explorer",
    requirement: (achievements) => achievements.includes("quest_novice"),
    emoji: "🗺️",
  },
  {
    name: "Master Quest-taker",
    requirement: (achievements) => achievements.includes("quest_veteran"),
    emoji: "🎖️",
  },
  {
    name: "Quest Legend",
    requirement: (achievements) => achievements.includes("quest_master"),
    emoji: "👑",
  },
  {
    name: "Coin Collector",
    requirement: (achievements) => achievements.includes("wealthy"),
    emoji: "🪙",
  },
  {
    name: "Treasure Hoarder",
    requirement: (achievements) => achievements.includes("rich"),
    emoji: "💎",
  },
  {
    name: "Flame Keeper",
    requirement: (achievements) => achievements.includes("dedicated"),
    emoji: "🔥",
  },
  {
    name: "Eternal Flame",
    requirement: (achievements) => achievements.includes("legendary"),
    emoji: "🌟",
  },
  {
    name: "Lightning Fast",
    requirement: (achievements) => achievements.includes("speedrunner"),
    emoji: "⚡",
  },
];

function getPlayerStats(player, totalCompletedQuests, todayCompletedQuests) {
  return {
    totalQuests: totalCompletedQuests,
    totalCoins: player.coins,
    maxStreak: player.streak,
    todayQuests: todayCompletedQuests,
  };
}

function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((achievement) => achievement.requirement(stats));
}

function getAchievementProgress(stats) {
  return ACHIEVEMENTS.map((achievement) => {
    const current = achievement.progress(stats);
    const max = achievement.maxProgress;
    const percentage = Math.floor((current / max) * 100);
    const progressBar = createProgressBar(current, max);

    return {
      ...achievement,
      current,
      max,
      percentage,
      progressBar,
      unlocked: achievement.requirement(stats),
    };
  });
}

function createProgressBar(current, max, length = 10) {
  const filled = Math.floor((current / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getUnlockedTitles(achievements) {
  const achievementIds = achievements.map((a) => a.id);
  return TITLES.filter((title) => title.requirement(achievementIds));
}

export default {
  name: "history",
  description: "View your quest history, achievements, and titles.",
  slashCommandData: {
    name: "history",
    description: "View your quest history, achievements, and titles.",
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const client = isInteraction ? messageOrInteraction.client : messageOrInteraction.client;

    try {
      // Get player data
      const [player] = await Player.findOrCreate({
        where: { userId: user.id },
        defaults: { coins: 0, streak: 0 },
      });

      // Count total completed quests for achievements
      const totalCompletedQuests = await QuestProgress.count({
        where: {
          userId: user.id,
          completed: true,
          claimed: true,
        },
      });

      // Count today's completed quests
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCompletedQuests = await QuestProgress.count({
        where: {
          userId: user.id,
          completed: true,
          claimed: true,
          updatedAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
        },
      });

      // Get last 5 completed quests
      const completedProgress = await QuestProgress.findAll({
        where: {
          userId: user.id,
          completed: true,
          claimed: true,
        },
        order: [["updatedAt", "DESC"]],
        limit: 5,
      });

      // Get quest details for each completed progress
      const questLogPromises = completedProgress.map(async (progress) => {
        const quest = await Quest.findByPk(progress.questId);
        if (!quest) return "Unknown Quest";

        const completionDate = progress.updatedAt.toLocaleDateString();
        return `**${quest.name}** - ${completionDate}\n💰 +${quest.rewardCoins} coins`;
      });

      const questEntries = await Promise.all(questLogPromises);
      const questLog =
        questEntries.length > 0
          ? questEntries.map((entry, index) => `${index + 1}. ${entry}`).join("\n\n")
          : "No completed quests yet. Start your adventure with `!quest`!";

      // Get player stats and achievements
      const stats = getPlayerStats(player, totalCompletedQuests, todayCompletedQuests);
      const unlockedAchievements = getUnlockedAchievements(stats);
      const allAchievements = getAchievementProgress(stats);
      const unlockedTitles = getUnlockedTitles(unlockedAchievements);

      // Create achievement display with progress
      const achievementsText = allAchievements
        .map((a) => {
          const status = a.unlocked ? "✅" : "⏳";
          return `${status} ${a.emoji} **${a.name}** - ${a.description}\n\`[${a.progressBar}]\` ${a.current}/${a.max} (${a.percentage}%)`;
        })
        .join("\n\n");

      const titlesText =
        unlockedTitles.length > 0
          ? unlockedTitles.map((t) => `${t.emoji} **${t.name}**`).join("\n")
          : "No titles earned yet. Unlock achievements to gain titles!";

      // Create statistics field
      const statsText = [
        `📊 **Total Quests Completed:** ${totalCompletedQuests}`,
        `💰 **Current Coins:** ${player.coins}`,
        `🔥 **Current Streak:** ${player.streak} days`,
        `⚡ **Today's Quests:** ${todayCompletedQuests}`,
        `🏆 **Achievements Unlocked:** ${unlockedAchievements.length}/${ACHIEVEMENTS.length}`,
        `👑 **Titles Earned:** ${unlockedTitles.length}`,
      ].join("\n");

      const embed = createCommandEmbed("history", {
        color: EMBED_COLORS.primary,
        title: "📜 Adventurer's History",
        thumbnail: user.displayAvatarURL({ dynamic: true, size: 128 }),
        fields: [
          {
            name: "� Statistics",
            value: statsText,
            inline: false,
          },
          {
            name: "�📋 Recent Quest Log (Last 5)",
            value: questLog,
            inline: false,
          },
          {
            name: "🏆 Achievement Progress",
            value:
              achievementsText.length > 1024
                ? achievementsText.substring(0, 1021) + "..."
                : achievementsText,
            inline: false,
          },
          {
            name: "👑 Titles & Badges",
            value: titlesText,
            inline: false,
          },
        ],
        footer: { text: "Keep adventuring to unlock more achievements and titles!" },
        timestamp: true,
      });

      await messageOrInteraction.reply({ embeds: [embed] });
    } catch (error) {
      historyLogger.error("Error executing history command:", error);
      const embed = createCommandEmbed("history", {
        color: EMBED_COLORS.error,
        title: "❌ Error",
        description: "There was an error retrieving your history. Please try again later.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
    }
  },
};
