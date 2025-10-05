import { type Message, type ChatInputCommandInteraction } from "discord.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

export default {
  name: "help",
  description: "Show the adventurer's guide.",
  slashCommandData: {
    name: "help",
    description: "Show the adventurer's guide.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const embed = createCommandEmbed("help", {
      color: EMBED_COLORS.info,
      title: "📖 Adventurer's Guide",
      fields: [
        {
          name: "🗣️ NPC Interaction",
          value:
            "`!talk` — Chat with the NPC.\n`!ask <question>` — Ask the NPC something mysterious.",
        },
        {
          name: "📜 Quests",
          value:
            "`!board` — View today's quest board.\n" +
            "`!quest` — Check your progress on the daily quest.\n" +
            "`!complete` — Claim your reward after completing a quest.\n" +
            "`!streak` — See your current streak and bonus.",
        },
        {
          name: "💰 Economy",
          value:
            "`!balance` — Check your coin balance.\n" +
            "`!daily` — Claim your daily coin reward (24h cooldown).\n" +
            "`!shop` — Browse items available for purchase.\n" +
            "`!buy <item>` — Purchase an item from the shop.\n" +
            "`!inventory` or `!inv` — View your purchased items.\n" +
            "`!leaderboard` — View the top adventurers.\n" +
            "`!streakboard` — View the top streaks.",
        },
        {
          name: "🎮 Fun & Games",
          value:
            "`!roll <dice>` — Roll dice (e.g., 1d20, 2d6).\n" +
            "`!8ball <question>` — Ask the mystical orb.\n" +
            "`!coinflip [side] [wager]` — Flip a coin, bet coins.\n" +
            "`!rps <choice> [wager]` — Rock paper scissors vs NPC.",
        },
        {
          name: "💡 Other",
          value:
            "`!ping` — Check the bot's latency.\n" +
            "`!stats` — View your adventurer profile.\n" +
            "`!setquestchannel #channel` — Set quest announcement channel (Admin).\n" +
            "`!help` — Show this adventurer's guide.",
        },
      ],
      footer: "✨ More features unlock as the world expands!",
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
