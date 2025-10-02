import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Player = sequelize.define("Player", {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  coins: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  streak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastDailyClaimAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export default Player;
