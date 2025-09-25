import { generateDailyQuest, getMsUntilNextReset } from "./questService.js";
import logger from "../utils/logger.js";

const schedulerLogger = logger.child("Scheduler");

let resetTimeout = null;

export function scheduleDailyReset(client) {
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

export function cancelDailyReset() {
  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }
}
