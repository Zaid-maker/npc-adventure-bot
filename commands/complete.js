import { claimQuestReward } from "../services/questService.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "complete",
  description: "Claim your reward after completing the daily quest.",
  slashCommandData: {
    name: "complete",
    description: "Claim your reward after completing the daily quest.",
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.questChannelId) {
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    try {
      const { quest, bonus, streak, totalCoins } = await claimQuestReward(user.id);
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

      await messageOrInteraction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.warning,
        title: "Quest Reward Unavailable",
        description: error.message || "❌ Unable to claim your reward right now.",
      });

      await messageOrInteraction.reply({ embeds: [embed] });
    }
  },
};
