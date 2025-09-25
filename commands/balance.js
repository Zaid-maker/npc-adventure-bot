import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "balance",
  description: "Check how many coins you currently hold.",
  async execute(message) {
    const [player] = await Player.findOrCreate({
      where: { userId: message.author.id },
      defaults: { coins: 0, streak: 0 },
    });

    const embed = createCommandEmbed("balance", {
      color: EMBED_COLORS.success,
      title: "Coin Purse Tally",
      description: `**${message.author.username}**, you currently hold **${player.coins} coins**.`,
      fields: [
        {
          name: "Streak Bonus",
          value: player.streak ? `+${player.streak * 5} coins per quest` : "No active streak",
          inline: true,
        },
      ],
    });

    await message.reply({ embeds: [embed] });
  },
};
