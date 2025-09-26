import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const setQuestChannelLogger = logger.child("Command:SetQuestChannel");

export default {
  name: "setquestchannel",
  description: "Set the channel for daily quest announcements (Admin only).",
  async execute(message, { args }) {
    if (!message.member.permissions.has("ManageChannels")) {
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.danger,
        title: "Permission Denied",
        description: "You need `Manage Channels` permission to set the quest channel.",
      });
      return message.reply({ embeds: [embed] });
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel) {
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.warning,
        title: "Invalid Channel",
        description:
          "Please mention a channel or provide its ID.\nExample: `!setquestchannel #quests`",
      });
      return message.reply({ embeds: [embed] });
    }

    if (channel.type !== 0) {
      // TEXT channel
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.warning,
        title: "Invalid Channel Type",
        description: "Please select a text channel.",
      });
      return message.reply({ embeds: [embed] });
    }

    await GuildSettings.upsert({
      guildId: message.guild.id,
      questChannelId: channel.id,
    });

    setQuestChannelLogger.info(
      `Quest channel set to ${channel.name} (${channel.id}) in guild ${message.guild.name}`,
    );

    const embed = createCommandEmbed("setquestchannel", {
      color: EMBED_COLORS.success,
      title: "Quest Channel Set",
      description: `Daily quests will now be announced in ${channel}.`,
    });

    await message.reply({ embeds: [embed] });
  },
};
