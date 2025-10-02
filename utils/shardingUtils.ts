import { Client } from "discord.js";
import logger from "./logger.js";

const shardLogger = logger.child("Sharding");

/**
 * Get total guild count across all shards
 */
export async function getTotalGuildCount(client: Client): Promise<number> {
  if (!client.shard) {
    return client.guilds.cache.size;
  }

  try {
    const results = await client.shard.fetchClientValues('guilds.cache.size');
    return (results as number[]).reduce((acc, count) => acc + count, 0);
  } catch (error) {
    shardLogger.error("Failed to get total guild count:", error);
    return client.guilds.cache.size;
  }
}

/**
 * Get total member count across all shards
 */
export async function getTotalMemberCount(client: Client): Promise<number> {
  if (!client.shard) {
    return client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  }

  try {
    const results = await client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0));
    return results.reduce((acc: number, count: number) => acc + count, 0);
  } catch (error) {
    shardLogger.error("Failed to get total member count:", error);
    return client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  }
}

/**
 * Get shard information
 */
export async function getShardInfo(client: Client): Promise<{
  shardId: number;
  shardCount: number;
  guilds: number;
  members: number;
  ping: number;
  uptime: number;
}> {
  const shardId = client.shard?.ids[0] ?? 0;
  const shardCount = client.shard ? await client.shard.fetchClientValues('shard.ids.length').then(results => results[0] as number) : 1;

  return {
    shardId,
    shardCount,
    guilds: client.guilds.cache.size,
    members: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
    ping: client.ws.ping,
    uptime: client.uptime ?? 0,
  };
}

/**
 * Get all shard information
 */
export async function getAllShardInfo(client: Client): Promise<Array<{
  shardId: number;
  guilds: number;
  members: number;
  ping: number;
  uptime: number;
  status: string;
}>> {
  if (!client.shard) {
    const info = await getShardInfo(client);
    return [{
      shardId: info.shardId,
      guilds: info.guilds,
      members: info.members,
      ping: info.ping,
      uptime: info.uptime,
      status: "online",
    }];
  }

  try {
    const results = await client.shard.broadcastEval(async (c) => {
      return {
        shardId: c.shard?.ids[0] ?? 0,
        guilds: c.guilds.cache.size,
        members: c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        ping: c.ws.ping,
        uptime: c.uptime ?? 0,
        status: c.ws.status === 0 ? "connecting" :
                c.ws.status === 1 ? "connected" :
                c.ws.status === 2 ? "reconnecting" :
                c.ws.status === 3 ? "idle" :
                c.ws.status === 4 ? "nearly" :
                c.ws.status === 5 ? "disconnected" : "unknown",
      };
    });

    return results;
  } catch (error) {
    shardLogger.error("Failed to get all shard info:", error);
    const info = await getShardInfo(client);
    return [{
      shardId: info.shardId,
      guilds: info.guilds,
      members: info.members,
      ping: info.ping,
      uptime: info.uptime,
      status: "online",
    }];
  }
}

/**
 * Broadcast a message to all shards
 */
export async function broadcastMessage(client: Client, message: string): Promise<void> {
  if (!client.shard) {
    shardLogger.info(`Broadcast message: ${message}`);
    return;
  }

  try {
    await client.shard.broadcastEval((c, { msg }) => {
      const logger = require('./utils/logger.js').default;
      logger.info(`Broadcast: ${msg}`);
    }, { context: { msg: message } });
  } catch (error) {
    shardLogger.error("Failed to broadcast message:", error);
  }
}

/**
 * Send a message to a specific channel across shards
 */
export async function sendCrossShardMessage(client: Client, channelId: string, content: any): Promise<boolean> {
  if (!client.shard) {
    try {
      const channel = client.channels.cache.get(channelId);
      if (channel && 'send' in channel) {
        await (channel as any).send(content);
        return true;
      }
      return false;
    } catch (error) {
      shardLogger.error("Failed to send message:", error);
      return false;
    }
  }

  try {
    const results = await client.shard.broadcastEval(async (c, { channelId: id, content: msg }) => {
      try {
        const channel = c.channels.cache.get(id);
        if (channel && 'send' in channel) {
          await (channel as any).send(msg);
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }, { context: { channelId, content } });

    return results.some(result => result === true);
  } catch (error) {
    shardLogger.error("Failed to send cross-shard message:", error);
    return false;
  }
}

/**
 * Restart a specific shard
 */
export async function restartShard(client: Client, shardId: number): Promise<boolean> {
  if (!client.shard) {
    shardLogger.warn("Cannot restart shard: not running in sharded mode");
    return false;
  }

  try {
    await client.shard.broadcastEval((c) => {
      if (c.shard?.ids.includes(shardId)) {
        process.exit(0);
      }
    });
    return true;
  } catch (error) {
    shardLogger.error(`Failed to restart shard ${shardId}:`, error);
    return false;
  }
}