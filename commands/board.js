import { getActiveQuest } from "../services/questService.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "board",
  description: "View the daily quest board.",
  async execute(message) {
    const quest = await getActiveQuest();
    if (!quest) {
      const emptyEmbed = createCommandEmbed("board", {
        color: EMBED_COLORS.neutral,
        title: "The Quest Board Stands Empty",
        description: "Return later—fresh adventures arrive with the dawn!",
      });

      await message.reply({ embeds: [emptyEmbed] });
      return;
    }

    const embed = createCommandEmbed("board", {
      color: EMBED_COLORS.info,
      title: "📜 Quest Board",
      description: `**${quest.name}**\n${quest.description}`,
      fields: [
        { name: "Reward", value: `${quest.rewardCoins} coins`, inline: true },
        { name: "Resets", value: quest.resetAt.toLocaleString(), inline: true },
      ],
    });

    await message.reply({ embeds: [embed] });
  },
};
