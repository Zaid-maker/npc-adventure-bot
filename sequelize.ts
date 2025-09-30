import fs from "fs";
import path from "path";
import { Sequelize } from "sequelize";
import logger from "./utils/logger.js";

const databaseLogger = logger.child("Database");
const storagePath = path.resolve("data", "npcbot.sqlite");
const storageDir = path.dirname(storagePath);

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  databaseLogger.debug(`Created SQLite directory at ${storageDir}`);
}

// Using SQLite for simplicity
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: storagePath,
  logging: false,
});

databaseLogger.info(`Using SQLite storage at ${storagePath}`);

export default sequelize;