import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import logger from "./utils/logger.js";
import path from "path";
import { fileURLToPath } from "url";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manager = new ShardingManager(path.join(__dirname, "index.js"), {
  token: process.env.DISCORD_TOKEN!,
  totalShards: process.env.TOTAL_SHARDS ? parseInt(process.env.TOTAL_SHARDS) : "auto",
  shardArgs: process.env.NODE_ENV === "development" ? ["--trace-warnings"] : [],
  execArgv: process.env.NODE_ENV === "development" ? ["--trace-warnings"] : [],
  respawn: true,
});

manager.on("shardCreate", (shard) => {
  logger.info(`🚀 Launched shard ${shard.id}`);

  // Increase the ready timeout to 60 seconds
  (shard as any).readyTimeout = 60000;

  shard.on("ready", () => {
    logger.success(`✅ Shard ${shard.id} is ready`);
  });

  shard.on("disconnect", () => {
    logger.warn(`⚠️  Shard ${shard.id} disconnected`);
  });

  shard.on("reconnecting", () => {
    logger.info(`🔄 Shard ${shard.id} is reconnecting`);
  });

  shard.on("death", (child) => {
    const exitCode = (child as any).exitCode || "unknown";
    logger.error(`💀 Shard ${shard.id} died with exit code ${exitCode}`);
  });

  shard.on("message", (message) => {
    logger.debug(`📨 Shard ${shard.id} sent message:`, message);
  });
});

process.on("SIGINT", async () => {
  logger.info("🛑 Received SIGINT, shutting down gracefully...");

  try {
    await manager.broadcastEval(() => {
      process.exit(0);
    });
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Received SIGTERM, shutting down gracefully...");

  try {
    await manager.broadcastEval(() => {
      process.exit(0);
    });
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
  }

  process.exit(0);
});

async function startSharding() {
  try {
    logger.info("🔄 Starting Discord bot with sharding...");

    const shardCount = manager.totalShards;
    logger.info(`📊 Total shards: ${shardCount}`);

    await manager.spawn({
      amount: shardCount,
      delay: 5500,
      timeout: 30000,
    });

    logger.success("🎉 All shards spawned successfully!");
  } catch (error) {
    logger.error("❌ Failed to start sharding:", error);
    process.exit(1);
  }
}

startSharding();