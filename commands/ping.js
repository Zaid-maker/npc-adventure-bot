import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";

const pingLogger = logger.child("Command:Ping");

function formatMs(ms) {
  return `${ms.toFixed(0)} ms`;
}

export default {
  name: "ping",
  description: "Measure the bot and API latency.",
  async execute(message) {
    const loadingEmbed = createCommandEmbed("ping", {
      color: EMBED_COLORS.primary,
      title: "🏓 Checking latency...",
      description: "Give me a heartbeat to measure the currents between us.",
      timestamp: false,
    });

    const sent = await message.reply({ embeds: [loadingEmbed], fetchReply: true });

    const roundTrip = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = message.client.ws.ping;

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
