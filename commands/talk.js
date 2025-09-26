import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

const replies = [
  "Greetings, traveler. Care to browse my wares?",
  "Ah, I haven’t seen you since the last quest!",
  "The road ahead is dangerous. Do you seek supplies?",
];

export default {
  name: "talk",
  description: "Chat with the NPC merchant.",
  slashCommandData: {
    name: "talk",
    description: "Chat with the NPC merchant.",
  },
  async execute(messageOrInteraction) {
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    const embed = createCommandEmbed("talk", {
      color: EMBED_COLORS.info,
      title: "🧺 Merchant's Greeting",
      description: randomReply,
    });

    await messageOrInteraction.reply({ embeds: [embed] });
  },
};
