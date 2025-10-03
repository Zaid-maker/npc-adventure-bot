import { Umzug, SequelizeStorage } from "umzug";
import sequelize from "./sequelize.js";
import logger from "./utils/logger.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdir } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationLogger = logger.child("Migrations");

// Create Umzug instance
export const umzug = new Umzug({
  migrations: {
    glob: ["migrations/*.js", { cwd: __dirname }],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: "SequelizeMeta",
  }),
  logger: {
    info: (message) => migrationLogger.info(message.message),
    warn: (message) => migrationLogger.warn(message.message),
    error: (message) => migrationLogger.error(message.message),
    debug: (message) => migrationLogger.debug(message.message),
  },
});

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    migrationLogger.info("Checking for pending migrations...");

    const pending = await umzug.pending();

    if (pending.length === 0) {
      migrationLogger.info("No pending migrations. Database is up to date.");
      return;
    }

    migrationLogger.info(`Found ${pending.length} pending migration(s). Running...`);

    const executed = await umzug.up();

    if (executed.length > 0) {
      migrationLogger.success(
        `✅ Successfully executed ${executed.length} migration(s): ${executed.map((m) => m.name).join(", ")}`,
      );
    }
  } catch (error) {
    migrationLogger.error("Failed to run migrations:", error);
    throw error;
  }
}

/**
 * Rollback the last migration
 */
export async function rollbackMigration(): Promise<void> {
  try {
    migrationLogger.info("Rolling back last migration...");
    const reverted = await umzug.down();
    if (reverted && reverted.length > 0 && reverted[0]) {
      migrationLogger.success(`✅ Rolled back migration: ${reverted[0].name}`);
    } else {
      migrationLogger.info("No migrations to roll back.");
    }
  } catch (error) {
    migrationLogger.error("Failed to rollback migration:", error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  executed: string[];
  pending: string[];
}> {
  const executed = await umzug.executed();
  const pending = await umzug.pending();

  return {
    executed: executed.map((m) => m.name),
    pending: pending.map((m) => m.name),
  };
}
