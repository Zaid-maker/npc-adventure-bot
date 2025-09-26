import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const setQuestChannelLogger = logger.child("Command:SetQuestChannel");

export default {
  name: "setquestchannel",
  description: "Set the channel for daily quest announcements (Admin only).",
  slashCommandData: {
    name: "setquestchannel",
    description: "Set the channel for daily quest announcements (Admin only).",
    options: [
      {
        name: "channel",
        description: "The channel for quest announcements",
        type: 7, // CHANNEL
        required: true,
      },
    ],
  },
  async execute(messageOrInteraction, { args } = {}) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const member = isInteraction ? messageOrInteraction.member : messageOrInteraction.member;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    if (!member.permissions.has("ManageChannels")) {
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.danger,
        title: "Permission Denied",
        description: "You need `Manage Channels` permission to set the quest channel.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    const channel = isInteraction
      ? messageOrInteraction.options.getChannel("channel")
      : messageOrInteraction.mentions.channels.first() ||
        messageOrInteraction.guild.channels.cache.get(args[0]);
    if (!channel) {
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.warning,
        title: "Invalid Channel",
        description:
          "Please mention a channel or provide its ID.\nExample: `!setquestchannel #quests`",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    if (channel.type !== 0) {
      // TEXT channel
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.warning,
        title: "Invalid Channel Type",
        description: "Please select a text channel.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
    }

    const existingSettings = await GuildSettings.findOne({ where: { guildId: guild.id } });

    await GuildSettings.upsert({
      guildId: guild.id,
      questChannelId: channel.id,
    });

    const action = existingSettings ? "updated" : "set";

    setQuestChannelLogger.info(
      `Quest channel ${action} to ${channel.name} (${channel.id}) in guild ${guild.name}`,
    );

    const embed = createCommandEmbed("setquestchannel", {
      color: EMBED_COLORS.success,
      title: `Quest Channel ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      description: `Daily quests will now be announced in ${channel}.`,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
