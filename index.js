import { Events } from "discord.js";
import dotenv from "dotenv";
import client from "./config/discordClient.js";
import sequelize from "./sequelize.js";
import Quest from "./models/Quest.js";
import QuestProgress from "./models/QuestProgress.js";
import Player from "./models/Player.js";
import GuildSettings from "./models/GuildSettings.js";
import { generateDailyQuest, getActiveQuest, trackQuestProgress } from "./services/questService.js";
import { scheduleDailyReset } from "./services/scheduler.js";
import { registerCommands, handleCommand, PREFIX } from "./handlers/commandRouter.js";
import logger from "./utils/logger.js";
import { createEmbed, EMBED_COLORS } from "./utils/embedBuilder.js";

import talkCommand from "./commands/talk.js";
import askCommand from "./commands/ask.js";
import boardCommand from "./commands/board.js";
import questCommand from "./commands/quest.js";
import completeCommand from "./commands/complete.js";
import streakCommand from "./commands/streak.js";
import balanceCommand from "./commands/balance.js";
import helpCommand from "./commands/help.js";
import pingCommand from "./commands/ping.js";
import statsCommand from "./commands/stats.js";
import leaderboardCommand from "./commands/leaderboard.js";
import streakboardCommand from "./commands/streakboard.js";
import setquestchannelCommand from "./commands/setquestchannel.js";

dotenv.config();

registerCommands([
  talkCommand,
  askCommand,
  boardCommand,
  questCommand,
  completeCommand,
  streakCommand,
  balanceCommand,
  helpCommand,
  pingCommand,
  statsCommand,
  leaderboardCommand,
  streakboardCommand,
  setquestchannelCommand,
]);

client.once(Events.ClientReady, async (readyClient) => {
  logger.success(`🤖 NPC Bot is online as ${readyClient.user.tag}`);

  await sequelize.sync();
  await Promise.all([Quest.sync(), QuestProgress.sync(), Player.sync(), GuildSettings.sync()]);

  const quest = await getActiveQuest();
  if (!quest || new Date() >= quest.resetAt) {
    await generateDailyQuest(client);
  }

  scheduleDailyReset(client);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  try {
    await trackQuestProgress(message);
  } catch (error) {
    logger.error("Failed to track quest progress:", error);
  }

  if (
    client.user &&
    message.mentions.has(client.user, {
      ignoreEveryone: true,
      ignoreRepliedUser: true,
      ignoreRoles: true,
    })
  ) {
    const mentionPattern = new RegExp(`<@!?${client.user.id}>`, "gi");
    const sanitized = message.content.replace(mentionPattern, " ").toLowerCase();
    const normalized = sanitized.replace(/\s+/g, " ").trim();

    if (
      normalized.includes("what's your prefix") ||
      normalized.includes("whats your prefix") ||
      normalized.includes("what is your prefix")
    ) {
      const embed = createEmbed(
        {
          color: EMBED_COLORS.info,
          title: "Current Prefix",
          description: `Use \`${PREFIX}\` before a command. Try \`${PREFIX}help\` to see what I can do.`,
          footer: { text: "Mention me anytime if you forget." },
          timestamp: false,
        },
        "prefix",
      );

      await message.reply({ embeds: [embed] });
      return;
    }
  }

  await handleCommand(message);
});

client.login(process.env.DISCORD_TOKEN);
