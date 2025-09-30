import { type Client, type Message } from "discord.js";
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
        ],
        footer: { text: "Complete the quest to claim your reward!" },
        timestamp: true,
      });

      await (channel as any).send({ embeds: [embed] });
    } catch (error) {
      questLogger.error(`Failed to announce quest in guild ${guild.id}:`, error);
    }
  }
}

export async function generateDailyQuest(client?: Client): Promise<any> {
  try {
    // Clean up old quests
    await Quest.destroy({ where: { daily: true } });

    // Select random quest
    const questData = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];
    const resetAt = getNextResetDate();

    const quest = await Quest.create({
      ...questData,
      daily: true,
      resetAt,
    });

    questLogger.info(`Generated daily quest: ${(quest as any).name}`);

    if (client) {
      await announceQuest(client, quest);
    }

    return quest;
  } catch (error) {
    questLogger.error("Failed to generate daily quest:", error);
    throw error;
  }
}

export async function getActiveQuest(): Promise<any | null> {
  return await Quest.findOne({ where: { daily: true } });
}

export async function getQuestWithProgress(userId: string): Promise<{ quest: any; progress: any }> {
  const quest = await getActiveQuest();
  if (!quest) return { quest: null, progress: null };

  const progress = await QuestProgress.findOne({
    where: { userId, questId: quest.id },
  });

  return { quest, progress };
}

export async function trackQuestProgress(message: Message): Promise<void> {
  try {
    const quest = await getActiveQuest();
    if (!quest) return;

    const userId = message.author.id;
    const content = message.content.toLowerCase();

    // Check if this message matches the quest pattern
    let shouldIncrement = false;

    if (QUEST_PATTERNS.message(quest, content)) {
      shouldIncrement = true;
    } else if (QUEST_PATTERNS.command(quest, content)) {
      shouldIncrement = true;
    }

    if (!shouldIncrement) return;

    // Get or create progress record
    const [progress] = await QuestProgress.findOrCreate({
      where: { userId, questId: quest.id },
      defaults: { progress: 0, completed: false, claimed: false },
    });

    const progressData = progress as any;
    const requirement = getQuestRequirement(quest);

    // Increment progress
    progressData.progress += 1;

    // Check completion
    if (progressData.progress >= requirement.count && !progressData.completed) {
      progressData.completed = true;
      questLogger.info(`User ${userId} completed quest: ${quest.name}`);

      // Auto-claim for state-based quests
      if (requirement.type === "state") {
        await autoClaimQuestReward(userId);
      }
    }

    await progress.save();
  } catch (error) {
    questLogger.error("Failed to track quest progress:", error);
  }
}

export async function autoClaimQuestReward(userId: string): Promise<void> {
  try {
    const { quest, progress } = await getQuestWithProgress(userId);
    if (!quest || !progress) return;

    const progressData = progress as any;
    if (!progressData.completed || progressData.claimed) return;

    const [player] = await Player.findOrCreate({
      where: { userId },
      defaults: { coins: 0, streak: 0 },
    });

    const playerData = player as any;
    const baseReward = quest.rewardCoins;
    const streakBonus = Math.floor(playerData.streak * 5); // 5 coins per streak day
    const totalReward = baseReward + streakBonus;

    playerData.coins += totalReward;
    progressData.claimed = true;

    // Update streak
    const now = new Date();
    const lastCompleted = playerData.lastCompletedAt;
    const isConsecutive =
      lastCompleted && now.getTime() - lastCompleted.getTime() < 48 * 60 * 60 * 1000; // 48 hours

    if (isConsecutive) {
      playerData.streak += 1;
    } else {
      playerData.streak = 1;
    }
    playerData.lastCompletedAt = now;

    await player.save();
    await progress.save();

    questLogger.info(
      `Auto-claimed ${totalReward} coins for user ${userId} (streak: ${playerData.streak})`,
    );
  } catch (error) {
    questLogger.error(`Failed to auto-claim reward for user ${userId}:`, error);
  }
}

export async function claimQuestReward(
  userId: string,
): Promise<{ quest: any; bonus: number; streak: number; totalCoins: number }> {
  const { quest, progress } = await getQuestWithProgress(userId);
  if (!quest || !progress) {
    throw new Error("No active quest found.");
  }

  const progressData = progress as any;
  if (!progressData.completed) {
    throw new Error("Quest not completed yet!");
  }

  if (progressData.claimed) {
    throw new Error("Reward already claimed!");
  }

  const [player] = await Player.findOrCreate({
    where: { userId },
    defaults: { coins: 0, streak: 0 },
  });

  const playerData = player as any;
  const baseReward = quest.rewardCoins;
  const streakBonus = Math.floor(playerData.streak * 5); // 5 coins per streak day
  const totalReward = baseReward + streakBonus;

  playerData.coins += totalReward;
  progressData.claimed = true;

  // Update streak
  const now = new Date();
  const lastCompleted = playerData.lastCompletedAt;
  const isConsecutive =
    lastCompleted && now.getTime() - lastCompleted.getTime() < 48 * 60 * 60 * 1000; // 48 hours

  if (isConsecutive) {
    playerData.streak += 1;
  } else {
    playerData.streak = 1;
  }
  playerData.lastCompletedAt = now;

  await player.save();
  await progress.save();

  questLogger.info(
    `User ${userId} claimed ${totalReward} coins (base: ${baseReward}, bonus: ${streakBonus})`,
  );

  return {
    quest,
    bonus: streakBonus,
    streak: playerData.streak,
    totalCoins: playerData.coins,
  };
}
