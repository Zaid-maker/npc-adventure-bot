import Quest from "../models/Quest.js";
import QuestProgress from "../models/QuestProgress.js";
import Player from "../models/Player.js";
import GuildSettings from "../models/GuildSettings.js";
import QUEST_POOL from "../constants/questPool.js";
import logger from "../utils/logger.js";
import { createEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

const questLogger = logger.child("QuestService");

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

  if (
    quest.name === "Send 5 Messages" ||
    quest.name === "Daily Chat Champion" ||
    quest.name === "Greet the Tavern"
  ) {
    progress.progress += 1;
    updated = true;
  }

  if (quest.name === "Talk to NPC 3 times" && content.startsWith("!talk")) {
    progress.progress += 1;
    updated = true;
  }

  if (quest.name === "Ask a Question" && content.startsWith("!ask")) {
    progress.progress += 1;
    updated = true;
  }

  if (quest.name === "Check the Quest Board" && content.startsWith("!board")) {
    progress.progress += 1;
    updated = true;
  }

  const completed =
    (quest.name === "Send 5 Messages" && progress.progress >= 5) ||
    (quest.name === "Daily Chat Champion" && progress.progress >= 20) ||
    (quest.name === "Greet the Tavern" && progress.progress >= 3) ||
    (quest.name === "Talk to NPC 3 times" && progress.progress >= 3) ||
    (quest.name === "Ask a Question" && progress.progress >= 1) ||
    (quest.name === "Check the Quest Board" && progress.progress >= 1);

  if (completed && !progress.completed) {
    progress.completed = true;
    updated = true;
  }

  if (updated) {
    await progress.save();
  }

  return { quest, progress };
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
