import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const QuestProgress = sequelize.define("QuestProgress", {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  questId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  claimed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

export default QuestProgress;