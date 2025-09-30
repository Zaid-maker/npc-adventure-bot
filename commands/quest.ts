import { type Message, type ChatInputCommandInteraction, type User, type Guild } from "discord.js";
import { getQuestWithProgress, getQuestRequirement } from "../services/questService.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "quest",
  description:
    "Check your progress on the active daily quest (auto-completes when requirements met).",
  slashCommandData: {
    name: "quest",
    description:
      "Check your progress on the active daily quest (auto-completes when requirements met).",
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
      const embed = createCommandEmbed("quest", {
        color: EMBED_COLORS.danger,
        title: "Error",
        description: "This command can only be used in a server.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !(settings as any).questChannelId) {
      const embed = createCommandEmbed("quest", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const { quest, progress } = await getQuestWithProgress(user.id);

    if (!quest) {
      const embed = createCommandEmbed("quest", {
        color: EMBED_COLORS.neutral,
        title: "No Daily Quest Available",
        description: "Come back later—new challenges arise with the sun!",
      });

      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const fields = [
      {
        name: "Reward",
        value: `${(quest as any).rewardCoins} coins`,
        inline: true,
      },
      {
        name: "Resets",
        value: (quest as any).resetAt.toLocaleString(),
        inline: true,
      },
    ];

    const requirement = getQuestRequirement(quest);
    const targetCount = requirement.count;

    if (progress) {
      const currentProgress = (progress as any).progress;
      const isCompleted = (progress as any).completed;

      let progressText;
      if (isCompleted) {
        progressText = `✅ **Completed!** (${currentProgress}/${targetCount})`;
      } else {
        progressText = `${currentProgress}/${targetCount}`;
        if (requirement.type === "message") {
          progressText += requirement.keyword
            ? ` - Say "${requirement.keyword}" in chat`
            : " - Send messages in chat";
        } else if (requirement.type === "command") {
          progressText += ` - Use \`${requirement.command}\``;
        } else if (requirement.type === "state") {
          progressText += " - Reach target goal";
        }
      }

      fields.push({
        name: "Progress",
        value: progressText,
        inline: false,
      });

      if (isCompleted && (progress as any).claimed) {
        fields.push({
          name: "Status",
          value: "🎉 **Reward Claimed!**",
          inline: true,
        });
      }
    } else {
      fields.push({
        name: "Progress",
        value: `0/${targetCount} - Start participating to begin!`,
        inline: false,
      });
    }

    const embed = createCommandEmbed("quest", {
      color: (progress as any)?.completed ? EMBED_COLORS.success : EMBED_COLORS.info,
      title: (quest as any).name,
      description: (quest as any).description,
      fields,
      footer: { text: "This quest auto-completes when you meet the requirements!" },
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
