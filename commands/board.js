import { getActiveQuest } from "../services/questService.js";

export default {
  name: "board",
  description: "View the daily quest board.",
  async execute(message) {
    const quest = await getActiveQuest();
    if (!quest) {
      await message.reply("📜 The quest board is empty for today...");
      return;
    }

    await message.reply(
      `📜 **Quest Board**\n\n` +
        `**${quest.name}**\n${quest.description}\n\n` +
        `Reward: ${quest.rewardCoins} coins\n` +
        `⏳ Resets: ${quest.resetAt.toLocaleString()}`,
    );
  },
};
