import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "streak",
  description: "View your current daily quest streak.",
  slashCommandData: {
    name: "streak",
    description: "View your current daily quest streak.",
  },
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.isChatInputCommand;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;

    const player = await Player.findOne({ where: { userId: user.id } });

    if (!player || player.streak === 0) {
      const embed = createCommandEmbed("streak", {
        color: EMBED_COLORS.neutral,
        title: "No Streak Yet",
        description: "Complete today's quest to spark your streak!",
      });

      await messageOrInteraction.reply({ embeds: [embed] });
      return;
    }

    const embed = createCommandEmbed("streak", {
      color: EMBED_COLORS.success,
      title: "🔥 Streak Status",
      fields: [
        { name: "Current Streak", value: `${player.streak} days`, inline: true },
        { name: "Bonus per Quest", value: `+${player.streak * 5} coins`, inline: true },
      ],
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
