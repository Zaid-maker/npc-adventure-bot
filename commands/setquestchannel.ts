import { Message, ChatInputCommandInteraction, GuildMember, TextChannel } from "discord.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const setQuestChannelLogger = logger.child("Command:SetQuestChannel");

interface CommandExecuteOptions {
  args?: string[];
}

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
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction, { args }: CommandExecuteOptions = {}): Promise<void> {
    const isInteraction = (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const member: GuildMember = isInteraction ? messageOrInteraction.member as GuildMember : messageOrInteraction.member as GuildMember;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    if (!member.permissions.has("ManageChannels")) {
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.danger,
        title: "Permission Denied",
        description: "You need `Manage Channels` permission to set the quest channel.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const channel = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).options.getChannel("channel")
      : (messageOrInteraction as Message).mentions.channels.first() ||
        (messageOrInteraction as Message).guild!.channels.cache.get(args?.[0] || "");
    if (!channel) {
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.warning,
        title: "Invalid Channel",
        description:
          "Please mention a channel or provide its ID.\nExample: `!setquestchannel #quests`",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    if (channel.type !== 0) {
      // TEXT channel
      const embed = createCommandEmbed("setquestchannel", {
        color: EMBED_COLORS.warning,
        title: "Invalid Channel Type",
        description: "Please select a text channel.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const existingSettings = await GuildSettings.findOne({ where: { guildId: guild!.id } });

    await GuildSettings.upsert({
      guildId: guild!.id,
      questChannelId: channel.id,
    });

    const action = existingSettings ? "updated" : "set";

    setQuestChannelLogger.info(
      `Quest channel ${action} to ${(channel as TextChannel).name} (${channel.id}) in guild ${guild!.name}`,
    );

    const embed = createCommandEmbed("setquestchannel", {
      color: EMBED_COLORS.success,
      title: `Quest Channel ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      description: `Daily quests will now be announced in ${channel}.`,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};