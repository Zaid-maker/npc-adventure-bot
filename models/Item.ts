import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Item = sequelize.define("Item", {
  itemId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  emoji: {
    type: DataTypes.STRING,
    defaultValue: "📦",
  },
  type: {
    type: DataTypes.ENUM("consumable", "permanent"),
    allowNull: false,
    defaultValue: "consumable",
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "general",
  },
  effects: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

export default Item;
