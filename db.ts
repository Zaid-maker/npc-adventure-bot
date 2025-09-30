// db.ts
import { Sequelize, DataTypes } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "npc.sqlite",
  logging: false,
});

const Player = sequelize.define("Player", {
  userId: { type: DataTypes.STRING, unique: true },
  username: DataTypes.STRING,
  coins: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastInteraction: DataTypes.DATE,
});

const Item = sequelize.define("Item", {
  name: { type: DataTypes.STRING, unique: true },
  description: DataTypes.STRING,
  price: DataTypes.INTEGER,
});

const PlayerItem = sequelize.define("PlayerItem", {
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
});

Player.belongsToMany(Item, { through: PlayerItem });
Item.belongsToMany(Player, { through: PlayerItem });

// NEW: Quests
const Quest = sequelize.define("Quest", {
  name: { type: DataTypes.STRING, unique: true },
  description: DataTypes.STRING,
  requirement: DataTypes.INTEGER,
  rewardCoins: { type: DataTypes.INTEGER, defaultValue: 0 },
  daily: { type: DataTypes.BOOLEAN, defaultValue: true }, // daily quest?
  resetAt: { type: DataTypes.DATE, allowNull: true }, // next reset time
});

const PlayerQuest = sequelize.define("PlayerQuest", {
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
});

Player.belongsToMany(Quest, { through: PlayerQuest });
Quest.belongsToMany(Player, { through: PlayerQuest });

await sequelize.sync();

export { sequelize, Player, Item, PlayerItem, Quest, PlayerQuest };
