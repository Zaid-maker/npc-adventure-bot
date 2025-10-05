import { SlashCommandBuilder, type Message, type ChatInputCommandInteraction } from "discord.js";
import Player from "../models/Player.js";
import { createEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

async function executeCoinFlip(
  userId: string,
  userTag: string,
  side: string | null,
  wager: number | null,
  reply: (options: any) => Promise<any>,
): Promise<void> {
  // Validate side choice
  const validSides = ["heads", "tails"];
  const chosenSide = side?.toLowerCase();

  if (wager && (!chosenSide || !validSides.includes(chosenSide))) {
    const errorEmbed = createEmbed(
      {
        color: EMBED_COLORS.danger,
        title: "❌ Invalid Choice",
        description:
          "When betting, you must choose **heads** or **tails**!\n\n" +
          "**Example:**\n" +
          "`/coinflip side:heads wager:50`",
        timestamp: true,
      },
      "coinflip-error",
    );

    await reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // If wager is provided, handle betting
  if (wager !== null) {
    if (wager < 1) {
      const errorEmbed = createEmbed(
        {
          color: EMBED_COLORS.danger,
          title: "❌ Invalid Wager",
          description: "You must wager at least **1 coin**!",
          timestamp: true,
        },
        "coinflip-error",
      );

      await reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    // Get player data
    const [playerData] = await Player.findOrCreate({
      where: { userId },
      defaults: { userId, coins: 0, streak: 0 },
    });

    const currentCoins = (playerData as any).coins || 0;

    if (currentCoins < wager) {
      const errorEmbed = createEmbed(
        {
          color: EMBED_COLORS.danger,
          title: "❌ Insufficient Coins",
          description: `You only have **${currentCoins}** coins, but tried to wager **${wager}** coins!`,
          timestamp: true,
        },
        "coinflip-error",
      );

      await reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    // Flip the coin
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === chosenSide;

    // Update player coins
    const newBalance = won ? currentCoins + wager : currentCoins - wager;
    await playerData.update({ coins: newBalance });

    // Create result embed
    const emoji = result === "heads" ? "🪙" : "🎖️";
    const resultText = won ? "**YOU WIN!** 🎉" : "**YOU LOSE!** 😔";

    const embed = createEmbed(
      {
        color: won ? EMBED_COLORS.success : EMBED_COLORS.danger,
        title: `${emoji} Coin Flip Result`,
        description:
          `${userTag} chose **${chosenSide}**\n` +
          `The coin lands on... **${result}**!\n\n` +
          `${resultText}\n\n` +
          `**Wager:** ${wager} coins\n` +
          `**Balance:** ${currentCoins} → **${newBalance}** coins\n` +
          `**${won ? "Gained" : "Lost"}:** ${wager} coins`,
        footer: { text: won ? "Lady Luck smiles upon you!" : "Better luck next time!" },
        timestamp: true,
      },
      "coinflip-wager",
    );

    await reply({ embeds: [embed] });
  } else {
    // Simple flip without wager
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const emoji = result === "heads" ? "🪙" : "🎖️";

    let description = `The coin spins through the air and lands on...\n\n# ${emoji} **${result.toUpperCase()}**!`;

    if (chosenSide) {
      const won = result === chosenSide;
      description += `\n\n${userTag} guessed **${chosenSide}** ${won ? "✅" : "❌"}`;
    }

    const embed = createEmbed(
      {
        color: EMBED_COLORS.primary,
        title: "🪙 Coin Flip",
        description,
        footer: { text: "Add a wager to bet coins!" },
        timestamp: true,
      },
      "coinflip-simple",
    );

    await reply({ embeds: [embed] });
  }
}

export default {
  name: "coinflip",
  description: "Flip a coin, optionally with a coin wager",

  slashCommandData: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin, optionally with a coin wager")
    .addStringOption((option) =>
      option
        .setName("side")
        .setDescription("Choose heads or tails")
        .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("wager")
        .setDescription("Amount of coins to bet (requires choosing a side)")
        .setMinValue(1)
        .setRequired(false),
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
      const side = interaction.options.getString("side");
      const wager = interaction.options.getInteger("wager");

      await executeCoinFlip(interaction.user.id, interaction.user.tag, side, wager, (opts) =>
        interaction.reply(opts),
      );
    } else {
      const message = messageOrInteraction as Message;
      const args = options?.args || [];
      let side: string | null = null;
      let wager: number | null = null;

      if (args.length > 0 && args[0]) {
        const firstArg = args[0].toLowerCase();
        if (firstArg === "heads" || firstArg === "tails") {
          side = firstArg;
          if (args[1]) {
            const parsedWager = parseInt(args[1]);
            if (!isNaN(parsedWager)) {
              wager = parsedWager;
            }
          }
        } else {
          // Try to parse as wager without side
          const parsedWager = parseInt(firstArg);
          if (!isNaN(parsedWager)) {
            wager = parsedWager;
          }
        }
      }

      await executeCoinFlip(message.author.id, message.author.tag, side, wager, (opts) =>
        message.reply(opts),
      );
    }
  },
};
