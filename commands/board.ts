import { type Message, type ChatInputCommandInteraction, type Guild } from "discord.js";
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
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction = (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const guild: Guild | null = isInteraction ? (messageOrInteraction as ChatInputCommandInteraction).guild : (messageOrInteraction as Message).guild;

    if (!guild) {
      const embed = createCommandEmbed("board", {
        color: EMBED_COLORS.danger,
        title: "Error",
        description: "This command can only be used in a server.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !(settings as any).questChannelId) {
      const embed = createCommandEmbed("board", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
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
      description: `**${(quest as any).name}**\n${(quest as any).description}`,
      fields: [
        { name: "Base Reward", value: `${(quest as any).rewardCoins} coins`, inline: true },
        { name: "Streak Bonus", value: "Up to +5 coins per day of streak", inline: true },
        { name: "Resets", value: (quest as any).resetAt.toLocaleString(), inline: false },
      ],
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};