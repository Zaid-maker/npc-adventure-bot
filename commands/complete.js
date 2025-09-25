import { claimQuestReward } from "../services/questService.js";

export default {
  name: "complete",
  description: "Claim your reward after completing the daily quest.",
  async execute(message) {
    try {
      const { quest, bonus, streak, totalCoins } = await claimQuestReward(message.author.id);

      await message.reply(
        `🎉 Quest complete! You earned **${quest.rewardCoins} coins** + streak bonus **${bonus} coins**.\n` +
          `🔥 Current streak: ${streak} days\n` +
          `💰 Total balance: ${totalCoins} coins`,
      );
    } catch (error) {
      await message.reply(error.message || "❌ Unable to claim your reward right now.");
    }
  },
};
