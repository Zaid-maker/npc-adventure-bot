import { type Message, type ChatInputCommandInteraction, type User, type Guild } from "discord.js";
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
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;
    const guild: Guild | null = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).guild
      : (messageOrInteraction as Message).guild;

    if (!guild) {
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.danger,
        title: "Error",
        description: "This command can only be used in a server.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !(settings as any).questChannelId) {
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    try {
      const { quest, bonus, streak, totalCoins } = await claimQuestReward(user.id);
      const embed = createCommandEmbed("complete", {
        color: EMBED_COLORS.success,
        title: "🎉 Quest Complete!",
        description: `You've claimed the reward for **${(quest as any).name}**.`,
        fields: [
          { name: "Base Reward", value: `${(quest as any).rewardCoins} coins`, inline: true },
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
        description: (error as Error).message || "❌ Unable to claim your reward right now.",
      });

      await messageOrInteraction.reply({ embeds: [embed] });
    }
  },
};
