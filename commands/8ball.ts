import { SlashCommandBuilder, type Message, type ChatInputCommandInteraction } from "discord.js";
import { createEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

const MYSTICAL_RESPONSES = [
  // Positive responses
  { text: "The spirits whisper... **It is certain.**", emoji: "🔮", color: EMBED_COLORS.success },
  {
    text: "The ancient runes foretell... **Without a doubt.**",
    emoji: "✨",
    color: EMBED_COLORS.success,
  },
  {
    text: "My visions are clear... **Yes, definitely.**",
    emoji: "🌟",
    color: EMBED_COLORS.success,
  },
  {
    text: "The prophecy confirms... **You may rely on it.**",
    emoji: "📿",
    color: EMBED_COLORS.success,
  },
  { text: "As I see it... **Yes.**", emoji: "🔮", color: EMBED_COLORS.success },
  {
    text: "The mystical forces align... **Most likely.**",
    emoji: "⭐",
    color: EMBED_COLORS.success,
  },
  { text: "The omens suggest... **Outlook good.**", emoji: "🌙", color: EMBED_COLORS.success },
  { text: "Signs point to... **Yes.**", emoji: "✨", color: EMBED_COLORS.success },

  // Uncertain responses
  {
    text: "The mists cloud my vision... **Reply hazy, try again.**",
    emoji: "🌫️",
    color: EMBED_COLORS.warning,
  },
  {
    text: "The spirits are silent... **Ask again later.**",
    emoji: "💭",
    color: EMBED_COLORS.warning,
  },
  {
    text: "The crystal ball is foggy... **Better not tell you now.**",
    emoji: "🔮",
    color: EMBED_COLORS.warning,
  },
  {
    text: "The future is uncertain... **Cannot predict now.**",
    emoji: "❓",
    color: EMBED_COLORS.warning,
  },
  {
    text: "The stars are not yet aligned... **Concentrate and ask again.**",
    emoji: "⭐",
    color: EMBED_COLORS.warning,
  },

  // Negative responses
  {
    text: "The darkness reveals... **Don't count on it.**",
    emoji: "🌑",
    color: EMBED_COLORS.danger,
  },
  { text: "My visions show... **My reply is no.**", emoji: "❌", color: EMBED_COLORS.danger },
  {
    text: "The prophecy warns... **My sources say no.**",
    emoji: "⚠️",
    color: EMBED_COLORS.danger,
  },
  {
    text: "The ancient texts decree... **Outlook not so good.**",
    emoji: "📜",
    color: EMBED_COLORS.danger,
  },
  { text: "The omens are dire... **Very doubtful.**", emoji: "💀", color: EMBED_COLORS.danger },
];

async function executeBall(
  question: string,
  reply: (options: any) => Promise<any>,
  userTag: string,
): Promise<void> {
  if (!question || question.trim().length === 0) {
    const errorEmbed = createEmbed(
      {
        color: EMBED_COLORS.danger,
        title: "❌ No Question Asked",
        description:
          "You must ask the mystical orb a question!\n\n" +
          "**Example:**\n" +
          "`/8ball Will I find treasure today?`",
        timestamp: true,
      },
      "8ball-error",
    );

    await reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // Pick a random response
  const response = MYSTICAL_RESPONSES[Math.floor(Math.random() * MYSTICAL_RESPONSES.length)]!;

  const embed = createEmbed(
    {
      color: response.color,
      title: `${response.emoji} The Mystical Orb Speaks`,
      description: `**${userTag} asks:**\n> ${question}\n\n${response.text}`,
      footer: { text: "The future is ever-changing, adventurer..." },
      timestamp: true,
    },
    "8ball-response",
  );

  await reply({ embeds: [embed] });
}

export default {
  name: "8ball",
  description: "Ask the mystical orb a yes/no question",

  slashCommandData: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the mystical orb a yes/no question")
    .addStringOption((option) =>
      option.setName("question").setDescription("Your yes/no question").setRequired(true),
    )
    .toJSON(),

  async execute(
    messageOrInteraction: Message | ChatInputCommandInteraction,
    options?: { args?: string[] },
  ) {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;

    if (isInteraction) {
      const interaction = messageOrInteraction as ChatInputCommandInteraction;
      const question = interaction.options.getString("question", true);
      await executeBall(question, (opts) => interaction.reply(opts), interaction.user.tag);
    } else {
      const message = messageOrInteraction as Message;
      const args = options?.args || [];
      const question = args.join(" ");

      if (!question) {
        const helpEmbed = createEmbed(
          {
            color: EMBED_COLORS.info,
            title: "🔮 Magic 8-Ball",
            description:
              "Consult the mystical orb for answers to your yes/no questions!\n\n" +
              "**Usage:** `!8ball <question>`\n\n" +
              "**Examples:**\n" +
              "• `!8ball Will I find treasure?`\n" +
              "• `!8ball Should I accept this quest?`\n" +
              "• `!8ball Is today my lucky day?`",
            timestamp: true,
          },
          "8ball-help",
        );

        await message.reply({ embeds: [helpEmbed] });
        return;
      }

      await executeBall(question, (opts) => message.reply(opts), message.author.tag);
    }
  },
};
