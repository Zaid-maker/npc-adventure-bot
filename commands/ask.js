import { EmbedBuilder } from "discord.js";
import { DEFAULT_RESPONSES, RUMORS, TOPICS } from "../constants/askLore.js";
import logger from "../utils/logger.js";

const askLogger = logger.child("Command:Ask");

function pickRandom(collection) {
  return collection[Math.floor(Math.random() * collection.length)];
}

function identifyTopic(question) {
  const lower = question.toLowerCase();
  return (
    TOPICS.find((topic) =>
      topic.keywords.some((keyword) => lower.includes(keyword.toLowerCase())),
    ) || null
  );
}

function buildEmbed({ question, authorTag, topic, insight, rumor }) {
  const embed = new EmbedBuilder()
    .setColor(topic?.color ?? 0x38bdf8)
    .setTitle(topic?.title ?? "The NPC Ponders...")
    .setDescription(
      [`**Traveler:** ${authorTag}`, `**Inquiry:** ${question}`, "", insight].join("\n"),
    )
    .setFooter({ text: "Tap !ask again if curiosity lingers." });

  if (rumor) {
    embed.addFields({
      name: "Rumor from the Tavern",
      value: rumor,
    });
  }

  return embed;
}

export default {
  name: "ask",
  description: "Ask the NPC a lore-filled question.",
  usage: "!ask <question>",
  async execute(message, { rawArgs }) {
    const question = rawArgs?.trim();
    if (!question) {
      await message.reply("❓ Ask me something like `!ask Where is the blacksmith?`");
      return;
    }

    const topic = identifyTopic(question);
    const insightSource = topic ? topic.responses : DEFAULT_RESPONSES;
    const insight = pickRandom(insightSource);
    const rumor = Math.random() < 0.35 ? pickRandom(RUMORS) : null;

    askLogger.debug(`Answering question with${topic ? ` topic ${topic.id}` : " default"} insights`);

    try {
      const embed = buildEmbed({
        question,
        authorTag: message.author.username,
        topic,
        insight,
        rumor,
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      askLogger.error("Failed to send ask embed:", error);
      const fallback = [
        `**Traveler:** ${message.author.username}`,
        `**Inquiry:** ${question}`,
        "",
        insight,
        rumor ? `\nRumor: ${rumor}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      await message.reply(fallback);
    }
  },
};
