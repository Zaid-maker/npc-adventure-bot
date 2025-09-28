import Player from "../models/Player.js";
import Quest from "../models/Quest.js";
import QuestProgress from "../models/QuestProgress.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";
import { Op } from "sequelize";

const historyLogger = logger.child("Command:History");

// Achievement definitions
const ACHIEVEMENTS = [
  { id: "first_quest", name: "First Steps", description: "Complete your first quest", requirement: (stats) => stats.totalQuests >= 1, emoji: "🎯" },
  { id: "quest_novice", name: "Quest Novice", description: "Complete 5 quests", requirement: (stats) => stats.totalQuests >= 5, emoji: "⚔️" },
  { id: "quest_veteran", name: "Quest Veteran", description: "Complete 25 quests", requirement: (stats) => stats.totalQuests >= 25, emoji: "🏆" },
  { id: "wealthy", name: "Wealthy Adventurer", description: "Accumulate 500 coins", requirement: (stats) => stats.totalCoins >= 500, emoji: "💰" },
  { id: "dedicated", name: "Dedicated Adventurer", description: "Maintain a 7-day streak", requirement: (stats) => stats.maxStreak >= 7, emoji: "🔥" },
  { id: "legendary", name: "Legendary Adventurer", description: "Maintain a 30-day streak", requirement: (stats) => stats.maxStreak >= 30, emoji: "👑" },
];

// Title definitions based on achievements
const TITLES = [
  { name: "Novice Adventurer", requirement: (achievements) => achievements.includes("first_quest"), emoji: "🌱" },
  { name: "Experienced Explorer", requirement: (achievements) => achievements.includes("quest_novice"), emoji: "🗺️" },
  { name: "Master Quest-taker", requirement: (achievements) => achievements.includes("quest_veteran"), emoji: "🎖️" },
  { name: "Coin Collector", requirement: (achievements) => achievements.includes("wealthy"), emoji: "🪙" },
  { name: "Flame Keeper", requirement: (achievements) => achievements.includes("dedicated"), emoji: "🔥" },
  { name: "Legend", requirement: (achievements) => achievements.includes("legendary"), emoji: "👑" },
];

function getPlayerStats(player, totalCompletedQuests) {
  return {
    totalQuests: totalCompletedQuests,
    totalCoins: player.coins,
    maxStreak: player.streak,
  };
}

function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.filter(achievement => achievement.requirement(stats));
}

function getUnlockedTitles(achievements) {
  const achievementIds = achievements.map(a => a.id);
  return TITLES.filter(title => title.requirement(achievementIds));
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

      // Get last 5 completed quests
      const completedProgress = await QuestProgress.findAll({
        where: {
          userId: user.id,
          completed: true,
          claimed: true,
        },
        order: [['updatedAt', 'DESC']],
        limit: 5,
      });

      // Get quest details for each completed progress
      const questLogPromises = completedProgress.map(async (progress) => {
        const quest = await Quest.findByPk(progress.questId);
        return quest ? `${quest.name} - ${progress.updatedAt.toLocaleDateString()}` : 'Unknown Quest';
      });

      const questEntries = await Promise.all(questLogPromises);
      const questLog = questEntries.length > 0
        ? questEntries.map((entry, index) => `${index + 1}. **${entry}**`).join('\n')
        : "No completed quests yet. Start your adventure with `!quest`!";

      // Get player stats and achievements
      const stats = getPlayerStats(player, totalCompletedQuests);
      const unlockedAchievements = getUnlockedAchievements(stats);
      const unlockedTitles = getUnlockedTitles(unlockedAchievements);

      const achievementsText = unlockedAchievements.length > 0
        ? unlockedAchievements.map(a => `${a.emoji} **${a.name}** - ${a.description}`).join('\n')
        : "No achievements unlocked yet. Keep completing quests!";

      const titlesText = unlockedTitles.length > 0
        ? unlockedTitles.map(t => `${t.emoji} **${t.name}**`).join('\n')
        : "No titles earned yet. Unlock achievements to gain titles!";

      const embed = createCommandEmbed("history", {
        color: EMBED_COLORS.primary,
        title: "📜 Adventurer's History",
        thumbnail: user.displayAvatarURL({ dynamic: true, size: 128 }),
        fields: [
          {
            name: "📋 Quest Log (Last 5)",
            value: questLog,
            inline: false,
          },
          {
            name: "🏆 Achievements",
            value: achievementsText,
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