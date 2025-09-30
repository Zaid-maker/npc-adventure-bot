import { type Message, type ChatInputCommandInteraction, type User } from "discord.js";
import Player from "../models/Player.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "streak",
  description: "View your current daily quest streak.",
  slashCommandData: {
    name: "streak",
    description: "View your current daily quest streak.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction = (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction ? (messageOrInteraction as ChatInputCommandInteraction).user : (messageOrInteraction as Message).author;

    const player = await Player.findOne({ where: { userId: user.id } });

    if (!player || (player as any).streak === 0) {
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
        { name: "Current Streak", value: `${(player as any).streak} days`, inline: true },
        { name: "Bonus per Quest", value: `+${(player as any).streak * 5} coins`, inline: true },
      ],
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};