import { Client, Message } from "discord.js";
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
  message: (quest: any, content: string): boolean => {
    if (quest.name === "Send 5 Messages" || quest.name === "Daily Chat Champion") {
      return true; // Any message counts
    }
    if (quest.name === "Greet the Tavern" && content.includes("hello")) {
      return true; // Must contain "hello"
    }
    return false;
  },

  // Command-based quests
  command: (quest: any, content: string): boolean => {
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
  state: (quest: any): boolean => {
    return ["Earn 30 Coins", "Generous Spirit", "Quest Veteran"].includes(quest.name);
  },
};

function getQuestRequirement(quest: any) {
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

function getTomorrowMidnight(): Date {
  const date = new Date();
  date.setHours(24, 0, 0, 0);
  return date;
}

export function getNextResetDate(): Date {
  return getTomorrowMidnight();
}

export function getMsUntilNextReset(): number {
  return getTomorrowMidnight().getTime() - Date.now();
}

async function announceQuest(client: Client, quest: any): Promise<void> {
  if (!client) return;

  for (const guild of client.guilds.cache.values()) {
    let settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !(settings as any).questChannelId) {
      // Fallback to env if no setting
      const fallbackChannelId = process.env.QUEST_CHANNEL_ID;
      if (!fallbackChannelId) continue;
      settings = { questChannelId: fallbackChannelId } as any;
    }

    try {
      const channel = await client.channels.fetch((settings as any).questChannelId);
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

      await (channel as any).send({ embeds: [embed] });
    } catch (error) {
      questLogger.error(`Failed to announce quest in guild ${guild.id}:`, error);
    }
  }
}

export async function generateDailyQuest(client: Client): Promise<any> {
  const chosen = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];

  await Quest.destroy({ where: { daily: true } });

  const quest = await Quest.create({
    ...chosen,
    daily: true,
    resetAt: getTomorrowMidnight(),
  });

  questLogger.info(`🌄 New Daily Quest: ${(quest as any).name}`);
  await announceQuest(client, quest);

  return quest;
}

export function getActiveQuest(): Promise<any> {
  return Quest.findOne({ where: { daily: true } });
}

export async function getQuestWithProgress(userId: string): Promise<any> {
  const quest = await getActiveQuest();
  if (!quest) {
    return { quest: null, progress: null };
  }

  const progress = await QuestProgress.findOne({
    where: { userId, questId: quest.id },
  });

  return { quest, progress };
}

export async function trackQuestProgress(message: Message): Promise<any> {
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
    (progress as any).progress += 1;
    updated = true;
  } else if (
    requirement.type === "command" &&
    QUEST_PATTERNS.command(quest, message.content.toLowerCase())
  ) {
    (progress as any).progress += 1;
    updated = true;
  }

  // Check completion based on requirement
  let isCompleted = false;

  if (requirement.type === "message" || requirement.type === "command") {
    isCompleted = (progress as any).progress >= requirement.count;
  } else if (requirement.type === "state") {
    // Handle state-based quests
    if (quest.name === "Earn 30 Coins") {
      const [player] = await Player.findOrCreate({
        where: { userId: message.author.id },
        defaults: { coins: 0, streak: 0 },
      });
      isCompleted = (player as any).coins >= 30;
    }
    // Other state-based quests can be added here
  }

  if (isCompleted && !(progress as any).completed) {
    (progress as any).completed = true;
    updated = true;

    // Automatically claim the reward for completed quests
    try {
      const rewardResult = await autoClaimQuestReward(message.author.id);
      if (rewardResult) {
        await sendQuestCompletionNotification(message, quest, rewardResult);
        questLogger.info(
          `🎉 Auto-completed quest "${quest.name}" for user ${message.author.username}`,
        );
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

async function sendQuestCompletionNotification(
  message: Message,
  quest: any,
  rewardResult: any,
): Promise<void> {
  const embed = createEmbed({
    color: EMBED_COLORS.success,
    title: "🎉 Quest Completed!",
    description: `Congratulations! You've completed **${quest.name}**`,
    fields: [
      {
        name: "💰 Reward Earned",
        value: `${rewardResult.bonus > 0 ? rewardResult.quest.rewardCoins + rewardResult.bonus : rewardResult.quest.rewardCoins} coins${rewardResult.bonus > 0 ? ` (+${rewardResult.bonus} streak bonus)` : ""}`,
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

export async function autoClaimQuestReward(userId: string): Promise<any> {
  const { quest, progress } = await getQuestWithProgress(userId);

  if (!quest || !progress || !(progress as any).completed || (progress as any).claimed) {
    return null; // Quest not ready for auto-claiming
  }

  (progress as any).claimed = true;
  await progress.save();

  const [player] = await Player.findOrCreate({
    where: { userId },
    defaults: { coins: 0, streak: 0 },
  });

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const playerData = player as any;
  if (playerData.lastCompletedAt) {
    const last = new Date(playerData.lastCompletedAt);
    if (last.toDateString() === yesterday.toDateString()) {
      playerData.streak += 1;
    } else if (last.toDateString() !== today.toDateString()) {
      playerData.streak = 1;
    }
  } else {
    playerData.streak = 1;
  }

  const bonus = playerData.streak * 5;

  playerData.coins += quest.rewardCoins + bonus;
  playerData.lastCompletedAt = today;
  await player.save();

  return {
    quest,
    bonus,
    streak: playerData.streak,
    totalCoins: playerData.coins,
  };
}

export async function claimQuestReward(userId: string): Promise<any> {
  const { quest, progress } = await getQuestWithProgress(userId);

  if (!quest) {
    throw new Error("📜 No active quest to complete.");
  }

  if (!progress) {
    throw new Error("❌ You haven’t started this quest yet.");
  }

  if (!(progress as any).completed) {
    throw new Error(`⏳ You haven’t finished **${quest.name}** yet.`);
  }

  if ((progress as any).claimed) {
    throw new Error("✅ You’ve already claimed this quest’s reward today.");
  }

  (progress as any).claimed = true;
  await progress.save();

  const [player] = await Player.findOrCreate({
    where: { userId },
    defaults: { coins: 0, streak: 0 },
  });

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const playerData = player as any;
  if (playerData.lastCompletedAt) {
    const last = new Date(playerData.lastCompletedAt);
    if (last.toDateString() === yesterday.toDateString()) {
      playerData.streak += 1;
    } else if (last.toDateString() !== today.toDateString()) {
      playerData.streak = 1;
    }
  } else {
    playerData.streak = 1;
  }

  const bonus = playerData.streak * 5;

  playerData.coins += quest.rewardCoins + bonus;
  playerData.lastCompletedAt = today;
  await player.save();

  return {
    quest,
    bonus,
    streak: playerData.streak,
    totalCoins: playerData.coins,
  };
}
