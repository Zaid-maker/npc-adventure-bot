import { type Message, type ChatInputCommandInteraction, type User, EmbedBuilder } from "discord.js";
import { getAllShardInfo, getTotalGuildCount, getTotalMemberCount } from "../utils/shardingUtils.js";
import { createCommandEmbed, EMBED_COLORS } from "../utils/embedBuilder.js";
import logger from "../utils/logger.js";
import client from "../config/discordClient.js";

const shardsLogger = logger.child("Command:Shards");

function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getStatusEmoji(status: string): string {
  switch (status.toLowerCase()) {
    case "connected": return "🟢";
    case "connecting": return "🟡";
    case "reconnecting": return "🟠";
    case "idle": return "🔵";
    case "nearly": return "🟣";
    case "disconnected": return "🔴";
    default: return "⚪";
  }
}

export default {
  name: "shards",
  description: "Display information about all bot shards.",
  slashCommandData: {
    name: "shards",
    description: "Display information about all bot shards.",
  },
  async execute(messageOrInteraction: Message | ChatInputCommandInteraction): Promise<void> {
    const isInteraction =
      (messageOrInteraction as ChatInputCommandInteraction).isChatInputCommand?.() ?? false;
    const user: User = isInteraction
      ? (messageOrInteraction as ChatInputCommandInteraction).user
      : (messageOrInteraction as Message).author;

    try {
      const [shardInfo, totalGuilds, totalMembers] = await Promise.all([
        getAllShardInfo(client),
        getTotalGuildCount(client),
        getTotalMemberCount(client),
      ]);

      const shardFields = shardInfo.map(shard => ({
        name: `${getStatusEmoji(shard.status)} Shard ${shard.shardId}`,
        value: [
          `**Guilds:** ${shard.guilds.toLocaleString()}`,
          `**Members:** ${shard.members.toLocaleString()}`,
          `**Ping:** ${shard.ping}ms`,
          `**Uptime:** ${formatUptime(shard.uptime)}`,
        ].join('\n'),
        inline: true,
      }));

      const embed = createCommandEmbed("shards", {
        color: EMBED_COLORS.info,
        title: "🔄 Shard Status",
        description: `**Total Shards:** ${shardInfo.length}\n**Total Guilds:** ${totalGuilds.toLocaleString()}\n**Total Members:** ${totalMembers.toLocaleString()}`,
        fields: shardFields,
        footer: { text: "Shard information updates in real-time" },
        timestamp: true,
      });

      await messageOrInteraction.reply({ embeds: [embed] });

      shardsLogger.debug(`Shard status requested by ${user.tag}: ${shardInfo.length} shards, ${totalGuilds} guilds, ${totalMembers} members`);
    } catch (error) {
      shardsLogger.error("Failed to get shard information:", error);

      const errorEmbed = createCommandEmbed("shards", {
        color: EMBED_COLORS.danger,
        title: "❌ Error",
        description: "Failed to retrieve shard information. Please try again later.",
        timestamp: true,
      });

      await messageOrInteraction.reply({ embeds: [errorEmbed] });
    }
  },
};