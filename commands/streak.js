import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "streak",
  description: "View your current daily quest streak.",
  async execute(message) {
    const player = await Player.findOne({ where: { userId: message.author.id } });

    if (!player || player.streak === 0) {
      const embed = createCommandEmbed("streak", {
        color: EMBED_COLORS.neutral,
        title: "No Streak Yet",
        description: "Complete today’s quest to spark your streak!",
      });

      await message.reply({ embeds: [embed] });
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

    await message.reply({ embeds: [embed] });
  },
};
