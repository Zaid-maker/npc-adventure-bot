import { getQuestWithProgress, getQuestRequirement } from "../services/questService.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "quest",
  description: "Check your progress on the active daily quest (auto-completes when requirements met).",
  slashCommandData: {
    name: "quest",
    description: "Check your progress on the active daily quest (auto-completes when requirements met).",
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const guild = isInteraction ? messageOrInteraction.guild : messageOrInteraction.guild;

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.questChannelId) {
      const embed = createCommandEmbed("quest", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      return messageOrInteraction.reply({ embeds: [embed] });
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
        value: `${quest.rewardCoins} coins`,
        inline: true,
      },
      {
        name: "Resets",
        value: quest.resetAt.toLocaleString(),
        inline: true,
      },
    ];

    const requirement = getQuestRequirement(quest);
    const targetCount = requirement.count;

    if (progress) {
      const currentProgress = progress.progress;
      const isCompleted = progress.completed;

      let progressText;
      if (isCompleted) {
        progressText = `✅ **Completed!** (${currentProgress}/${targetCount})`;
      } else {
        progressText = `${currentProgress}/${targetCount}`;
        if (requirement.type === "message") {
          progressText += requirement.keyword ? ` - Say "${requirement.keyword}" in chat` : " - Send messages in chat";
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

      if (isCompleted && progress.claimed) {
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
      color: progress?.completed ? EMBED_COLORS.success : EMBED_COLORS.info,
      title: quest.name,
      description: quest.description,
      fields,
      footer: { text: "This quest auto-completes when you meet the requirements!" },
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
