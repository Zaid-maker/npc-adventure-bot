import { SlashCommandBuilder, type Message, type ChatInputCommandInteraction } from "discord.js";
import Player from "../models/Player.js";
import { createEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";

type Choice = "rock" | "paper" | "scissors";

const CHOICE_EMOJIS: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

function determineWinner(playerChoice: Choice, npcChoice: Choice): "win" | "lose" | "tie" {
  if (playerChoice === npcChoice) return "tie";

  const winConditions: Record<Choice, Choice> = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  return winConditions[playerChoice] === npcChoice ? "win" : "lose";
}

async function executeRPS(
  userId: string,
  userTag: string,
  choice: string | null,
  wager: number | null,
  reply: (options: any) => Promise<any>,
): Promise<void> {
  const validChoices: Choice[] = ["rock", "paper", "scissors"];
  const playerChoice = choice?.toLowerCase() as Choice;

  if (!playerChoice || !validChoices.includes(playerChoice)) {
    const errorEmbed = createEmbed(
      {
        color: EMBED_COLORS.danger,
        title: "❌ Invalid Choice",
        description:
          "You must choose **rock**, **paper**, or **scissors**!\n\n" +
          "**Example:**\n" +
          "`/rps choice:rock wager:50`",
        timestamp: true,
      },
      "rps-error",
    );

    await reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // NPC makes a choice
  const npcChoice: Choice = validChoices[Math.floor(Math.random() * validChoices.length)]!;
  const result = determineWinner(playerChoice, npcChoice);

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
        "rps-error",
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
        "rps-error",
      );

      await reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    // Update player coins
    let coinsChange = 0;
    if (result === "win") {
      coinsChange = wager;
    } else if (result === "lose") {
      coinsChange = -wager;
    }

    const newBalance = currentCoins + coinsChange;
    await playerData.update({ coins: newBalance });

    // Create result embed
    let resultText = "";
    let resultEmoji = "";
    let embedColor: number = EMBED_COLORS.primary;

    if (result === "win") {
      resultText = "**YOU WIN!** 🎉";
      resultEmoji = "🏆";
      embedColor = EMBED_COLORS.success;
    } else if (result === "lose") {
      resultText = "**YOU LOSE!** 😔";
      resultEmoji = "💀";
      embedColor = EMBED_COLORS.danger;
    } else {
      resultText = "**IT'S A TIE!** 🤝";
      resultEmoji = "🤝";
      embedColor = EMBED_COLORS.warning;
    }

    const embed = createEmbed(
      {
        color: embedColor,
        title: `${resultEmoji} Rock Paper Scissors`,
        description:
          `${CHOICE_EMOJIS[playerChoice]} **${userTag}** chose **${playerChoice}**\n` +
          `${CHOICE_EMOJIS[npcChoice]} **NPC** chose **${npcChoice}**\n\n` +
          `${resultText}\n\n` +
          `**Wager:** ${wager} coins\n` +
          `**Balance:** ${currentCoins} → **${newBalance}** coins\n` +
          (result !== "tie"
            ? `**${result === "win" ? "Gained" : "Lost"}:** ${wager} coins`
            : "**No coins exchanged**"),
        footer: {
          text:
            result === "win"
              ? "You've bested the NPC!"
              : result === "lose"
                ? "The NPC outplayed you!"
                : "A worthy match!",
        },
        timestamp: true,
      },
      "rps-wager",
    );

    await reply({ embeds: [embed] });
  } else {
    // Simple game without wager
    let resultText = "";
    let resultEmoji = "";
    let embedColor: number = EMBED_COLORS.primary;

    if (result === "win") {
      resultText = "**YOU WIN!** 🎉";
      resultEmoji = "🏆";
      embedColor = EMBED_COLORS.success;
    } else if (result === "lose") {
      resultText = "**YOU LOSE!** 😔";
      resultEmoji = "💀";
      embedColor = EMBED_COLORS.danger;
    } else {
      resultText = "**IT'S A TIE!** 🤝";
      resultEmoji = "🤝";
      embedColor = EMBED_COLORS.warning;
    }

    const embed = createEmbed(
      {
        color: embedColor,
        title: `${resultEmoji} Rock Paper Scissors`,
        description:
          `${CHOICE_EMOJIS[playerChoice]} **You** chose **${playerChoice}**\n` +
          `${CHOICE_EMOJIS[npcChoice]} **NPC** chose **${npcChoice}**\n\n` +
          `${resultText}`,
        footer: { text: "Add a wager to bet coins!" },
        timestamp: true,
      },
      "rps-simple",
    );

    await reply({ embeds: [embed] });
  }
}

export default {
  name: "rps",
  description: "Play rock-paper-scissors against the NPC",

  slashCommandData: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock-paper-scissors against the NPC")
    .addStringOption((option) =>
      option
        .setName("choice")
        .setDescription("Choose your weapon")
        .addChoices(
          { name: "🪨 Rock", value: "rock" },
          { name: "📄 Paper", value: "paper" },
          { name: "✂️ Scissors", value: "scissors" },
        )
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("wager")
        .setDescription("Amount of coins to bet")
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
      const choice = interaction.options.getString("choice", true);
      const wager = interaction.options.getInteger("wager");

      await executeRPS(interaction.user.id, interaction.user.tag, choice, wager, (opts) =>
        interaction.reply(opts),
      );
    } else {
      const message = messageOrInteraction as Message;
      const args = options?.args || [];

      if (args.length === 0) {
        const helpEmbed = createEmbed(
          {
            color: EMBED_COLORS.info,
            title: "🪨📄✂️ Rock Paper Scissors",
            description:
              "Challenge the NPC to a game of rock-paper-scissors!\n\n" +
              "**Usage:** `!rps <choice> [wager]`\n\n" +
              "**Choices:** rock, paper, scissors\n\n" +
              "**Examples:**\n" +
              "• `!rps rock` - Play without betting\n" +
              "• `!rps paper 50` - Play and bet 50 coins\n" +
              "• `!rps scissors 100` - Play and bet 100 coins",
            timestamp: true,
          },
          "rps-help",
        );

        await message.reply({ embeds: [helpEmbed] });
        return;
      }

      const choice = args[0]!.toLowerCase();
      let wager: number | null = null;

      if (args[1]) {
        const parsedWager = parseInt(args[1]);
        if (!isNaN(parsedWager)) {
          wager = parsedWager;
        }
      }

      await executeRPS(message.author.id, message.author.tag, choice, wager, (opts) =>
        message.reply(opts),
      );
    }
  },
};
