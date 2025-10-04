import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Quest = sequelize.define("Quest", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rewardCoins: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  daily: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  resetAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

export default Quest;
