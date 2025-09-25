import { Sequelize } from "sequelize";

// Using SQLite for simplicity
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./npcbot.sqlite",
  logging: false,
});

export default sequelize;
