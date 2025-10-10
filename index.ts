import {
  Events,
  SlashCommandBuilder,
  REST,
  Routes,
  MessageFlags,
  type Client,
  type Message,
  type ChatInputCommandInteraction,
  type Interaction,
  type ActivityType,
} from "discord.js";
import { type APIApplicationCommand } from "discord-api-types/v10";
import dotenv from "dotenv";
import client from "./config/discordClient.js";
import sequelize from "./sequelize.js";
import Quest from "./models/Quest.js";
import QuestProgress from "./models/QuestProgress.js";
import Player from "./models/Player.js";
import GuildSettings from "./models/GuildSettings.js";
import Item from "./models/Item.js";
import PlayerInventory from "./models/PlayerInventory.js";
import { generateDailyQuest, getActiveQuest, trackQuestProgress } from "./services/questService.js";
import { scheduleDailyReset, scheduleOwnerFunding } from "./services/scheduler.js";
import { registerCommands, handleCommand, listCommands, PREFIX } from "./handlers/commandRouter.js";
import { runMigrations } from "./migrate.js";
import logger from "./utils/logger.js";
import { createEmbed, EMBED_COLORS } from "./utils/embedBuilder.js";

import talkCommand from "./commands/talk.js";
import askCommand from "./commands/ask.js";
import boardCommand from "./commands/board.js";
import questCommand from "./commands/quest.js";
import completeCommand from "./commands/complete.js";
import streakCommand from "./commands/streak.js";
import balanceCommand from "./commands/balance.js";
import dailyCommand from "./commands/daily.js";
import shopCommand from "./commands/shop.js";
import buyCommand from "./commands/buy.js";
import inventoryCommand from "./commands/inventory.js";
import helpCommand from "./commands/help.js";
import pingCommand from "./commands/ping.js";
import statsCommand from "./commands/stats.js";
import leaderboardCommand from "./commands/leaderboard.js";
import streakboardCommand from "./commands/streakboard.js";
import setquestchannelCommand from "./commands/setquestchannel.js";
import historyCommand from "./commands/history.js";
import giveCommand from "./commands/give.js";
import shardsCommand from "./commands/shards.js";
import rollCommand from "./commands/roll.js";
import eightBallCommand from "./commands/8ball.js";
import coinFlipCommand from "./commands/coinflip.js";
import rpsCommand from "./commands/rps.js";

dotenv.config();

// Check if we're running in a shard
const isSharded = process.env.SHARDING_MANAGER;
const shardId = process.env.SHARDS ? parseInt(process.env.SHARDS.split(",")[0] || "0") : 0;

if (isSharded) {
  logger.info(`🔄 Running in sharded mode - Shard ID: ${shardId}`);
} else {
  logger.info("🔄 Running in single-process mode");
}

registerCommands([
  talkCommand,
  askCommand,
  boardCommand,
  questCommand,
  completeCommand,
  streakCommand,
  balanceCommand,
  dailyCommand,
  shopCommand,
  buyCommand,
  inventoryCommand,
  helpCommand,
  pingCommand,
  statsCommand,
  leaderboardCommand,
  streakboardCommand,
  setquestchannelCommand,
  historyCommand,
  giveCommand,
  shardsCommand,
  rollCommand,
  eightBallCommand,
  coinFlipCommand,
  rpsCommand,
]);

const slashCommands: APIApplicationCommand[] = listCommands()
  .filter((cmd) => cmd.slashCommandData)
  .map((cmd) => cmd.slashCommandData);

const slashCommandMap = new Map<string, any>();
listCommands()
  .filter((cmd) => cmd.slashCommandData)
  .forEach((cmd) => slashCommandMap.set(cmd.name, cmd));

client.once(Events.ClientReady, async (readyClient: Client) => {
  logger.success(`🤖 NPC Bot is online as ${readyClient.user!.tag} (Shard ${shardId})`);

  // Only the first shard handles database initialization and scheduling
  if (shardId === 0) {
    // Run migrations to ensure database schema is up to date
    await runMigrations();

    const quest = await getActiveQuest();
    if (!quest || new Date() >= (quest as any).resetAt) {
      await generateDailyQuest(client);
    }

    scheduleDailyReset(client);
    scheduleOwnerFunding(); // Auto-fund bot owner every 30 minutes
  }

  // Set bot activity with rotation
  const activities: Array<{ name: string; type: ActivityType }> = [
    { name: "adventurers on their quests! 🗡️", type: 3 }, // Watching
    { name: "Bot is in alpha stage ⚠️", type: 0 }, // Playing
  ];

  let currentActivityIndex = 0;

  const updateActivity = () => {
    const activity = activities[currentActivityIndex];
    if (activity) {
      client.user!.setPresence({
        activities: [activity],
        status: "online",
      });
    }

    currentActivityIndex = (currentActivityIndex + 1) % activities.length;
  };

  // Set initial activity
  updateActivity();

  // Rotate activities every 30 seconds
  setInterval(updateActivity, 30000);
});

client.on(Events.MessageCreate, async (message: Message) => {
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
    const mentionPattern = new RegExp(`<@!?${client.user!.id}>`, "gi");
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

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = slashCommandMap.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error("Error executing slash command:", error);
    const reply = {
      content: "There was an error while executing this command!",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: slashCommands });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}

client.login(process.env.DISCORD_TOKEN!);
