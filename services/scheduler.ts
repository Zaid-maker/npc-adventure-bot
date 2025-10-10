import { Client } from "discord.js";
import { generateDailyQuest, getMsUntilNextReset } from "./questService.js";
import Player from "../models/Player.js";
import logger from "../utils/logger.js";

const schedulerLogger = logger.child("Scheduler");

let resetTimeout: NodeJS.Timeout | null = null;
let ownerFundingInterval: NodeJS.Timeout | null = null;

const OWNER_FUNDING_AMOUNT = 100000; // 100k coins
const OWNER_FUNDING_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

export function scheduleDailyReset(client: Client): NodeJS.Timeout | null {
  if (resetTimeout) {
    clearTimeout(resetTimeout);
  }

  const delay = Math.max(getMsUntilNextReset(), 1000);

  resetTimeout = setTimeout(async () => {
    resetTimeout = null;

    try {
      await generateDailyQuest(client);
    } catch (error) {
      schedulerLogger.error("Failed to generate daily quest during scheduled reset:", error);
    }

    scheduleDailyReset(client);
  }, delay);

  return resetTimeout;
}

export function cancelDailyReset(): void {
  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }
}

/**
 * Schedules automatic funding for the bot owner
 * Grants the bot owner coins every 30 minutes
 */
export function scheduleOwnerFunding(): NodeJS.Timeout | null {
  const botOwnerId = process.env.BOT_OWNER;

  if (!botOwnerId) {
    schedulerLogger.info("BOT_OWNER not set in .env, skipping auto-funding");
    return null;
  }

  // Cancel any existing interval
  if (ownerFundingInterval) {
    clearInterval(ownerFundingInterval);
  }

  // Fund immediately on startup
  fundBotOwner(botOwnerId);

  // Then fund every 30 minutes
  ownerFundingInterval = setInterval(async () => {
    await fundBotOwner(botOwnerId);
  }, OWNER_FUNDING_INTERVAL);

  schedulerLogger.info(
    `🏦 Bot owner auto-funding scheduled: ${OWNER_FUNDING_AMOUNT} coins every ${OWNER_FUNDING_INTERVAL / 60000} minutes`,
  );

  return ownerFundingInterval;
}

/**
 * Cancels the bot owner funding schedule
 */
export function cancelOwnerFunding(): void {
  if (ownerFundingInterval) {
    clearInterval(ownerFundingInterval);
    ownerFundingInterval = null;
    schedulerLogger.info("Bot owner auto-funding cancelled");
  }
}

/**
 * Grants coins to the bot owner
 */
async function fundBotOwner(userId: string): Promise<void> {
  try {
    const [player] = await Player.findOrCreate({
      where: { userId },
      defaults: { userId, coins: 0, streak: 0 },
    });

    const currentCoins = (player as any).coins || 0;
    const newBalance = currentCoins + OWNER_FUNDING_AMOUNT;

    await player.update({ coins: newBalance });

    schedulerLogger.success(
      `💰 Bot owner funded: ${currentCoins} → ${newBalance} coins (+${OWNER_FUNDING_AMOUNT})`,
    );
  } catch (error) {
    schedulerLogger.error("Failed to fund bot owner:", error);
  }
}
