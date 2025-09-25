import { claimQuestReward } from "../services/questService.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "complete",
  description: "Claim your reward after completing the daily quest.",
  async execute(message) {
    try {
      const { quest, bonus, streak, totalCoins } = await claimQuestReward(message.author.id);
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.success,
        title: "🎉 Quest Complete!",
        description: `You've claimed the reward for **${quest.name}**.`,
        fields: [
          { name: "Base Reward", value: `${quest.rewardCoins} coins`, inline: true },
          { name: "Streak Bonus", value: `${bonus} coins`, inline: true },
          { name: "🔥 Current Streak", value: `${streak} days`, inline: true },
          { name: "💰 Total Balance", value: `${totalCoins} coins`, inline: true },
        ],
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.warning,
        title: "Quest Reward Unavailable",
        description: error.message || "❌ Unable to claim your reward right now.",
      });

      await message.reply({ embeds: [embed] });
    }
  },
};
