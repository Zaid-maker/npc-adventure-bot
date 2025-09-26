import { getActiveQuest } from "../services/questService.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "board",
  description: "View the daily quest board.",
  slashCommandData: {
    name: "board",
    description: "View the daily quest board.",
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.questChannelId) {
      const embed = createCommandEmbed("board", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    const quest = await getActiveQuest();
    if (!quest) {
      const emptyEmbed = createCommandEmbed("board", {
        color: EMBED_COLORS.neutral,
        title: "The Quest Board Stands Empty",
        description: "Return later—fresh adventures arrive with the dawn!",
      });

      await messageOrInteraction.reply({ embeds: [emptyEmbed] });
      return;
    }

    const embed = createCommandEmbed("board", {
      color: EMBED_COLORS.info,
      title: "📜 Quest Board",
      description: `**${quest.name}**\n${quest.description}`,
      fields: [
        { name: "Base Reward", value: `${quest.rewardCoins} coins`, inline: true },
        { name: "Streak Bonus", value: "Up to +5 coins per day of streak", inline: true },
        { name: "Resets", value: quest.resetAt.toLocaleString(), inline: false },
      ],
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
