import { getQuestWithProgress } from "../services/questService.js";
import GuildSettings from "../models/GuildSettings.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "quest",
  description: "Check your progress on the active daily quest.",
  async execute(message) {
    const settings = await GuildSettings.findOne({ where: { guildId: message.guild.id } });
    if (!settings || !settings.questChannelId) {
      const embed = createCommandEmbed("quest", {
        color: EMBED_COLORS.warning,
        title: "Setup Required",
        description: "Please set up a quest channel first using `!setquestchannel #channel`.",
      });
      return message.reply({ embeds: [embed] });
    }

    const { quest, progress } = await getQuestWithProgress(message.author.id);

    if (!quest) {
      const embed = createCommandEmbed("quest", {
        color: EMBED_COLORS.neutral,
        title: "No Daily Quest Available",
        description: "Come back later—new challenges arise with the sun!",
      });

      await message.reply({ embeds: [embed] });
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

    if (progress) {
      fields.push({
        name: "Progress",
        value: `${progress.progress}${progress.completed ? " ✅" : ""}`,
        inline: true,
      });
    } else {
      fields.push({ name: "Progress", value: "0", inline: true });
    }

    const embed = createCommandEmbed("quest", {
      color: EMBED_COLORS.info,
      title: quest.name,
      description: quest.description,
      fields,
    });

    await message.reply({ embeds: [embed] });
  },
};
