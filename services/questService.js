import Quest from "../models/Quest.js";
import QuestProgress from "../models/QuestProgress.js";
import Player from "../models/Player.js";
import GuildSettings from "../models/GuildSettings.js";
import QUEST_POOL from "../constants/questPool.js";
import logger from "../utils/logger.js";
import { createEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

const questLogger = logger.child("QuestService");

// Quest tracking patterns
const QUEST_PATTERNS = {
  // Message-based quests
  message: (quest, content) => {
    if (quest.name === "Send 5 Messages" || quest.name === "Daily Chat Champion") {
      return true; // Any message counts
    }
    if (quest.name === "Greet the Tavern" && content.includes("hello")) {
      return true; // Must contain "hello"
    }
    return false;
  },

  // Command-based quests
  command: (quest, content) => {
    if (quest.name === "Talk to NPC 3 times" && content.startsWith("!talk")) {
      return true;
    }
    if (quest.name === "Ask a Question" && content.startsWith("!ask")) {
      return true;
    }
    if (quest.name === "Check the Quest Board" && content.startsWith("!board")) {
      return true;
    }
    return false;
  },

  // State-based quests (checked separately)
  state: (quest) => {
    return ["Earn 30 Coins", "Generous Spirit", "Quest Veteran"].includes(quest.name);
  }
};

function getQuestRequirement(quest) {
  const desc = quest.description.toLowerCase();

  if (desc.includes("hello")) return { type: "message", keyword: "hello", count: 3 };
  if (desc.includes("messages")) return { type: "message", count: desc.includes("5") ? 5 : 20 };
  if (desc.includes("!talk")) return { type: "command", command: "!talk", count: 3 };
  if (desc.includes("!ask")) return { type: "command", command: "!ask", count: 1 };
  if (desc.includes("!board")) return { type: "command", command: "!board", count: 1 };
  if (desc.includes("coins")) return { type: "state", count: 30 };

  return { type: "unknown", count: 1 };
}

export { getQuestRequirement };

function getTomorrowMidnight() {
  const date = new Date();
  date.setHours(24, 0, 0, 0);
  return date;
}

export function getNextResetDate() {
  return getTomorrowMidnight();
}

export function getMsUntilNextReset() {
  return getTomorrowMidnight().getTime() - Date.now();
}

async function announceQuest(client, quest) {
  if (!client) return;

  for (const guild of client.guilds.cache.values()) {
    let settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.questChannelId) {
      // Fallback to env if no setting
      const fallbackChannelId = process.env.QUEST_CHANNEL_ID;
      if (!fallbackChannelId) continue;
      settings = { questChannelId: fallbackChannelId };
    }

    try {
      const channel = await client.channels.fetch(settings.questChannelId);
      if (!channel) continue;

      const embed = createEmbed({
        color: EMBED_COLORS.info,
        title: "📜 New Daily Quest Appears!",
        description: `**${quest.name}**\n${quest.description}`,
        fields: [
          {
            name: "💰 Reward",
            value: `${quest.rewardCoins} coins`,
            inline: true,
          },
          {
            name: "⏳ Resets",
            value: quest.resetAt.toLocaleString(),
            inline: true,
          },
          {
            name: "🔥 Streak Bonus",
            value: "Up to +5 coins per day of streak",
            inline: true,
          },
        ],
        footer: { text: "Complete this quest to earn rewards! Use !quest to check progress." },
        timestamp: true,
      });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      questLogger.error(`Failed to announce quest in guild ${guild.id}:`, error);
    }
  }
}

export async function generateDailyQuest(client) {
  const chosen = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];

  await Quest.destroy({ where: { daily: true } });

  const quest = await Quest.create({
    ...chosen,
    daily: true,
    resetAt: getTomorrowMidnight(),
  });

  questLogger.info(`🌄 New Daily Quest: ${quest.name}`);
  await announceQuest(client, quest);

  return quest;
}

export function getActiveQuest() {
  return Quest.findOne({ where: { daily: true } });
}

export async function getQuestWithProgress(userId) {
  const quest = await getActiveQuest();
  if (!quest) {
    return { quest: null, progress: null };
  }

  const progress = await QuestProgress.findOne({
    where: { userId, questId: quest.id },
  });

  return { quest, progress };
}

export async function trackQuestProgress(message) {
  const quest = await getActiveQuest();
  if (!quest) return null;

  const [progress] = await QuestProgress.findOrCreate({
    where: { userId: message.author.id, questId: quest.id },
    defaults: { progress: 0 },
  });

  const content = message.content.toLowerCase();
  let updated = false;

  // Use intelligent quest tracking
  const requirement = getQuestRequirement(quest);

  if (requirement.type === "message" && QUEST_PATTERNS.message(quest, content)) {
    progress.progress += 1;
    updated = true;
  } else if (requirement.type === "command" && QUEST_PATTERNS.command(quest, message.content.toLowerCase())) {
    progress.progress += 1;
    updated = true;
  }

  // Check completion based on requirement
  let isCompleted = false;

  if (requirement.type === "message" || requirement.type === "command") {
    isCompleted = progress.progress >= requirement.count;
  } else if (requirement.type === "state") {
    // Handle state-based quests
    if (quest.name === "Earn 30 Coins") {
      const [player] = await Player.findOrCreate({
        where: { userId: message.author.id },
        defaults: { coins: 0, streak: 0 },
      });
      isCompleted = player.coins >= 30;
    }
    // Other state-based quests can be added here
  }

  if (isCompleted && !progress.completed) {
    progress.completed = true;
    updated = true;

    // Automatically claim the reward for completed quests
    try {
      const rewardResult = await autoClaimQuestReward(message.author.id);
      if (rewardResult) {
        await sendQuestCompletionNotification(message, quest, rewardResult);
        questLogger.info(`🎉 Auto-completed quest "${quest.name}" for user ${message.author.username}`);
      }
    } catch (error) {
      questLogger.error(`Failed to auto-claim reward for quest "${quest.name}":`, error);
    }
  }

  if (updated) {
    await progress.save();
  }

  return { quest, progress };
}

async function sendQuestCompletionNotification(message, quest, rewardResult) {
  const embed = createEmbed({
    color: EMBED_COLORS.success,
    title: "🎉 Quest Completed!",
    description: `Congratulations! You've completed **${quest.name}**`,
    fields: [
      {
        name: "💰 Reward Earned",
        value: `${rewardResult.bonus > 0 ? rewardResult.quest.rewardCoins + rewardResult.bonus : rewardResult.quest.rewardCoins} coins${rewardResult.bonus > 0 ? ` (+${rewardResult.bonus} streak bonus)` : ''}`,
        inline: true,
      },
      {
        name: "🔥 Current Streak",
        value: `${rewardResult.streak} days`,
        inline: true,
      },
      {
        name: "💰 New Balance",
        value: `${rewardResult.totalCoins} coins`,
        inline: true,
      },
    ],
    footer: { text: "Quest completed automatically! Keep up the great work!" },
    timestamp: true,
  });

  try {
    await message.reply({ embeds: [embed] });
  } catch (error) {
    questLogger.error("Failed to send quest completion notification:", error);
  }
}

export async function autoClaimQuestReward(userId) {
  const { quest, progress } = await getQuestWithProgress(userId);

  if (!quest || !progress || !progress.completed || progress.claimed) {
    return null; // Quest not ready for auto-claiming
  }

  progress.claimed = true;
  await progress.save();

  const [player] = await Player.findOrCreate({
    where: { userId },
    defaults: { coins: 0, streak: 0 },
  });

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (player.lastCompletedAt) {
    const last = new Date(player.lastCompletedAt);
    if (last.toDateString() === yesterday.toDateString()) {
      player.streak += 1;
    } else if (last.toDateString() !== today.toDateString()) {
      player.streak = 1;
    }
  } else {
    player.streak = 1;
  }

  const bonus = player.streak * 5;

  player.coins += quest.rewardCoins + bonus;
  player.lastCompletedAt = today;
  await player.save();

  return {
    quest,
    bonus,
    streak: player.streak,
    totalCoins: player.coins,
  };
}

export async function claimQuestReward(userId) {
  const { quest, progress } = await getQuestWithProgress(userId);

  if (!quest) {
    throw new Error("📜 No active quest to complete.");
  }

  if (!progress) {
    throw new Error("❌ You haven’t started this quest yet.");
  }

  if (!progress.completed) {
    throw new Error(`⏳ You haven’t finished **${quest.name}** yet.`);
  }

  if (progress.claimed) {
    throw new Error("✅ You’ve already claimed this quest’s reward today.");
  }

  progress.claimed = true;
  await progress.save();

  const [player] = await Player.findOrCreate({
    where: { userId },
    defaults: { coins: 0, streak: 0 },
  });

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (player.lastCompletedAt) {
    const last = new Date(player.lastCompletedAt);
    if (last.toDateString() === yesterday.toDateString()) {
      player.streak += 1;
    } else if (last.toDateString() !== today.toDateString()) {
      player.streak = 1;
    }
  } else {
    player.streak = 1;
  }

  const bonus = player.streak * 5;

  player.coins += quest.rewardCoins + bonus;
  player.lastCompletedAt = today;
  await player.save();

  return {
    quest,
    bonus,
    streak: player.streak,
    totalCoins: player.coins,
  };
}
