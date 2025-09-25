import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import { WEALTH_TIERS, resolveWealthTier } from "../constants/wealthTiers.js";

export default {
  name: "balance",
  description: "Check how many coins you currently hold.",
  async execute(message) {
    const [player] = await Player.findOrCreate({
      where: { userId: message.author.id },
      defaults: { coins: 0, streak: 0 },
    });

    const tier = resolveWealthTier(player.coins);
    const nextTier = WEALTH_TIERS.find((candidate) => candidate.min > tier.min);

    const nextMilestoneValue =
      nextTier && nextTier.min > player.coins
        ? `${nextTier.emoji} ${nextTier.name} — ${nextTier.min - player.coins} coins to go`
        : "You've reached the pinnacle of prosperity!";

    const embed = createCommandEmbed("balance", {
      color: EMBED_COLORS.success,
      title: "Coin Purse Tally",
      description: `**${message.author.username}**, you currently hold **${player.coins} coins**.\n${tier.emoji} Your wealth rank: **${tier.name}**.`,
      fields: [
        {
          name: "Wealth Standing",
          value: `${tier.emoji} ${tier.name}`,
          inline: true,
        },
        {
          name: "Streak Bonus",
          value: player.streak ? `+${player.streak * 5} coins per quest` : "No active streak",
          inline: true,
        },
        {
          name: "Next Milestone",
          value: nextMilestoneValue,
        },
      ],
    });

    await message.reply({ embeds: [embed] });
  },
};
