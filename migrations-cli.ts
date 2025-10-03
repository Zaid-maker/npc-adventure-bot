#!/usr/bin/env node
/**
 * Migration CLI tool
 * Usage:
 *   bun migrate up       - Run all pending migrations
 *   bun migrate down     - Rollback the last migration
 *   bun migrate status   - Show migration status
 */

import { runMigrations, rollbackMigration, getMigrationStatus, umzug } from "./migrate.js";
import logger from "./utils/logger.js";

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case "up":
        await runMigrations();
        break;

      case "down":
        await rollbackMigration();
        break;

      case "status": {
        const status = await getMigrationStatus();
        console.log("\n📊 Migration Status:\n");
        console.log("✅ Executed:");
        if (status.executed.length === 0) {
          console.log("   (none)");
        } else {
          status.executed.forEach((name) => console.log(`   - ${name}`));
        }
        console.log("\n⏳ Pending:");
        if (status.pending.length === 0) {
          console.log("   (none)");
        } else {
          status.pending.forEach((name) => console.log(`   - ${name}`));
        }
        console.log("");
        break;
      }

      case "create": {
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error("❌ Please provide a migration name:");
          console.error("   bun run migrate:create <migration-name>");
          process.exit(1);
        }

        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").split(".")[0];
        const filename = `${timestamp}-${migrationName}.ts`;

        console.log(`\n📝 Create migration file: migrations/${filename}`);
        console.log("\nTemplate:");
        console.log(`
import { DataTypes, QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  // Write migration code here
}

export async function down(queryInterface: QueryInterface) {
  // Write rollback code here
}
        `);
        break;
      }

      default:
        console.log(`
🗄️  NPC Bot Migration Tool

Usage:
  bun run migrate up       - Run all pending migrations
  bun run migrate down     - Rollback the last migration
  bun run migrate status   - Show migration status
  bun run migrate create <name> - Show template for new migration

Examples:
  bun run migrate up
  bun run migrate status
  bun run migrate create add-user-level
        `);
        break;
    }

    process.exit(0);
  } catch (error) {
    logger.error("Migration command failed:", error);
    process.exit(1);
  }
}

main();
