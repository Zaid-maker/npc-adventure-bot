import dotenv from "dotenv";
import client from "./config/discordClient.js";
import sequelize from "./sequelize.js";
import Quest from "./models/Quest.js";
import QuestProgress from "./models/QuestProgress.js";
import Player from "./models/Player.js";
import { generateDailyQuest, getActiveQuest, trackQuestProgress } from "./services/questService.js";
import { scheduleDailyReset } from "./services/scheduler.js";
import { registerCommands, handleCommand } from "./handlers/commandRouter.js";

import talkCommand from "./commands/talk.js";
import askCommand from "./commands/ask.js";
import boardCommand from "./commands/board.js";
import questCommand from "./commands/quest.js";
import completeCommand from "./commands/complete.js";
import streakCommand from "./commands/streak.js";
import balanceCommand from "./commands/balance.js";
import helpCommand from "./commands/help.js";

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
]);

client.once("ready", async () => {
  console.log(`🤖 NPC Bot is online as ${client.user.tag}`);

  await sequelize.sync();
  await Promise.all([Quest.sync(), QuestProgress.sync(), Player.sync()]);

  const quest = await getActiveQuest();
  if (!quest || new Date() >= quest.resetAt) {
    await generateDailyQuest(client);
  }

  scheduleDailyReset(client);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    await trackQuestProgress(message);
  } catch (error) {
    console.error("Failed to track quest progress:", error);
  }

  await handleCommand(message);
});

client.login(process.env.DISCORD_TOKEN);
