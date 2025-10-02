import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const PlayerInventory = sequelize.define(
  "PlayerInventory",
  {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    itemId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    purchasedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "itemId"],
      },
    ],
  },
);

export default PlayerInventory;
