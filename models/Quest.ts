import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Quest = sequelize.define("Quest", {
  name: DataTypes.STRING,
  description: DataTypes.STRING,
  rewardCoins: DataTypes.INTEGER,
  daily: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  resetAt: {
    type: DataTypes.DATE,
  },
});

export default Quest;
