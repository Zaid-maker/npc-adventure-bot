import { type Message, type ChatInputCommandInteraction, type User } from "discord.js";
import { DEFAULT_RESPONSES, RUMORS, TOPICS } from "../constants/askLore.js";
import logger from "../utils/logger.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

const askLogger = logger.child("Command:Ask");

function pickRandom<T>(collection: T[]): T {
  if (collection.length === 0) {
    throw new Error("Cannot pick from empty collection");
  }
  return collection[Math.floor(Math.random() * collection.length)]!;
}

function identifyTopic(question: string) {
  const lower = question.toLowerCase();
  return (
    TOPICS.find((topic) =>
      topic.keywords.some((keyword) => lower.includes(keyword.toLowerCase())),
    ) || null
  );
}

interface CommandExecuteOptions {
  rawArgs?: string;
}

export default {
  name: "ask",
  description: "Ask the NPC a lore-filled question.",
  usage: "!ask <question>",
  slashCommandData: {
    name: "ask",
    description: "Ask the NPC a lore-filled question.",
    options: [
      {
        name: "question",
        description: "Your question for the NPC",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction, { rawArgs }: CommandExecuteOptions = {}): Promise<void> {
    const isInteraction = (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction ? (messageOrInteraction as ChatInputCommandInteraction).user : (messageOrInteraction as Message).author;
    const question = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).options.getString("question")
      : rawArgs?.trim();

    if (!question) {
      const helpEmbed = createCommandEmbed("ask", {
        color: EMBED_COLORS.warning,
        title: "Curiosity needs a question!",
        description: "Try something like `!ask Where is the blacksmith?`",
      });

      await messageOrInteraction.reply({ embeds: [helpEmbed] });
      return;
    }

    const topic = identifyTopic(question);
    const insightSource = topic ? topic.responses : DEFAULT_RESPONSES;
    const insight = pickRandom(insightSource);
    const rumor = Math.random() < 0.35 ? pickRandom(RUMORS) : null;

    askLogger.debug(`Answering question with${topic ? ` topic ${topic.id}` : " default"} insights`);

    try {
      const embed = createCommandEmbed("ask", {
        color: topic?.color ?? EMBED_COLORS.info,
        title: topic?.title ?? "The NPC Ponders...",
        description: [
          `**Traveler:** ${user.username}`,
          `**Inquiry:** ${question}`,
          "",
          insight,
        ].join("\n"),
        footer: "Tap !ask again if curiosity lingers.",
      });

      if (rumor) {
        embed.addFields({ name: "Rumor from the Tavern", value: rumor });
      }

      await messageOrInteraction.reply({ embeds: [embed] });
    } catch (error) {
      askLogger.error("Failed to send ask embed:", error);
      const fallback = [
        `**Traveler:** ${user.username}`,
        `**Inquiry:** ${question}`,
        "",
        insight,
        rumor ? `\nRumor: ${rumor}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      await messageOrInteraction.reply(fallback);
    }
  },
};