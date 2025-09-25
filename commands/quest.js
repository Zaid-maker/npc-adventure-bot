import { getQuestWithProgress } from "../services/questService.js";

export default {
  name: "quest",
  description: "Check your progress on the active daily quest.",
  async execute(message) {
    const { quest, progress } = await getQuestWithProgress(message.author.id);

    if (!quest) {
      await message.reply("📜 No daily quest available.");
      return;
    }

    const progressText = progress
      ? `Progress: ${progress.progress} ${progress.completed ? "(✅ Completed)" : ""}`
      : "Progress: 0";

    await message.reply(
      `📜 **${quest.name}**\n${quest.description}\n\n` +
        `Reward: ${quest.rewardCoins} coins\n${progressText}\n` +
        `⏳ Resets: ${quest.resetAt.toLocaleString()}`,
    );
  },
};
