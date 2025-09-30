import { type Message, type ChatInputCommandInteraction } from "discord.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const pingLogger = logger.child("Command:Ping");

function formatMs(ms: number): string {
  return `${ms.toFixed(0)} ms`;
}

export default {
  name: "ping",
  description: "Measure the bot and API latency.",
  slashCommandData: {
    name: "ping",
    description: "Measure the bot and API latency.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const client = messageOrInteraction.client;

    const loadingEmbed = createCommandEmbed("ping", {
      color: EMBED_COLORS.primary,
      title: "🏓 Checking latency...",
      description: "Give me a heartbeat to measure the currents between us.",
      timestamp: false,
    });

    const response = await messageOrInteraction.reply({
      embeds: [loadingEmbed],
      withResponse: true,
    });

    let sent: Message;
    if (isInteraction) {
      sent = await (messageOrInteraction as ChatInputCommandInteraction).fetchReply();
    } else {
      sent = response as unknown as Message;
    }

    const roundTrip = sent.createdTimestamp - messageOrInteraction.createdTimestamp;
    const apiPing = client.ws.ping;

    pingLogger.debug(`Round-trip ${roundTrip} ms | API ${apiPing} ms`);

    const resultEmbed = createCommandEmbed("ping", {
      color: EMBED_COLORS.info,
      title: "🏓 Latency Report",
      fields: [
        { name: "Round-trip", value: formatMs(roundTrip), inline: true },
        { name: "API Heartbeat", value: formatMs(apiPing), inline: true },
      ],
      timestamp: true,
    });

    await sent.edit({ embeds: [resultEmbed] });
  },
};
