import { SlashCommandBuilder, type Message, type ChatInputCommandInteraction } from "discord.js";
import { createEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

function parseDiceNotation(notation: string): { count: number; sides: number } | null {
  const match = notation.match(/^(\d+)?d(\d+)$/i);
  if (!match) return null;

  const count = parseInt(match[1] || "1");
  const sides = parseInt(match[2]!);

  if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
    return null;
  }

  return { count, sides };
}

function rollDice(count: number, sides: number): { rolls: number[]; total: number } {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return { rolls, total: rolls.reduce((sum, roll) => sum + roll, 0) };
}

async function executeRoll(
  dice: string,
  reply: (options: any) => Promise<any>,
  userTag: string,
): Promise<void> {
  const parsed = parseDiceNotation(dice);

  if (!parsed) {
    const errorEmbed = createEmbed(
      {
        color: EMBED_COLORS.danger,
        title: "❌ Invalid Dice Notation",
        description:
          "Please use standard dice notation like:\n" +
          "• `1d20` - Roll a 20-sided die\n" +
          "• `2d6` - Roll two 6-sided dice\n" +
          "• `3d8` - Roll three 8-sided dice\n\n" +
          "**Limits:** 1-100 dice, 2-1000 sides",
        timestamp: true,
      },
      "dice-error",
    );

    await reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  const { count, sides } = parsed;
  const { rolls, total } = rollDice(count, sides);

  // Choose appropriate emoji based on roll result
  let resultEmoji = "🎲";
  if (sides === 20) {
    if (total === 20 * count)
      resultEmoji = "🎯"; // Natural 20(s)
    else if (total === count) resultEmoji = "💀"; // Natural 1(s)
  }

  // Build description
  let description = `**${count}d${sides}**: Rolling ${count} ${sides}-sided ${count === 1 ? "die" : "dice"}...\n\n`;

  // Show individual rolls if not too many
  if (count <= 20) {
    description += `**Rolls:** ${rolls.map((r) => `\`${r}\``).join(" + ")}\n`;
  } else {
    description += `**Rolls:** Too many to display individually\n`;
  }

  description += `**Total:** **${total}**`;

  // Add flavor text for special rolls
  if (sides === 20) {
    if (total === 20 * count) {
      description += "\n\n🎉 **CRITICAL SUCCESS!** The gods smile upon you!";
    } else if (total === count) {
      description += "\n\n💀 **CRITICAL FAILURE!** Perhaps try praying harder next time...";
    }
  }

  const embed = createEmbed(
    {
      color: EMBED_COLORS.primary,
      title: `${resultEmoji} ${userTag}'s Roll`,
      description,
      footer: { text: "May the RNG be in your favor!" },
      timestamp: true,
    },
    "dice-roll",
  );

  await reply({ embeds: [embed] });
}

export default {
  name: "roll",
  description: "Roll dice using standard RPG notation (e.g., 1d20, 2d6)",

  slashCommandData: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll dice using standard RPG notation")
    .addStringOption((option) =>
      option
        .setName("dice")
        .setDescription("Dice notation (e.g., 1d20, 2d6, 3d8)")
        .setRequired(true),
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
      const dice = interaction.options.getString("dice", true);
      await executeRoll(dice, (opts) => interaction.reply(opts), interaction.user.tag);
    } else {
      const message = messageOrInteraction as Message;
      const args = options?.args || [];

      if (args.length === 0) {
        const helpEmbed = createEmbed(
          {
            color: EMBED_COLORS.info,
            title: "🎲 Dice Roll Command",
            description:
              "Roll dice using standard RPG notation!\n\n" +
              "**Usage:** `!roll <dice>`\n\n" +
              "**Examples:**\n" +
              "• `!roll 1d20` - Roll a d20\n" +
              "• `!roll 2d6` - Roll 2d6\n" +
              "• `!roll 4d8` - Roll 4d8\n\n" +
              "**Limits:** 1-100 dice, 2-1000 sides",
            timestamp: true,
          },
          "dice-help",
        );

        await message.reply({ embeds: [helpEmbed] });
        return;
      }

      await executeRoll(args[0]!, (opts) => message.reply(opts), message.author.tag);
    }
  },
};
