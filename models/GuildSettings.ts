import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const GuildSettings = sequelize.define("GuildSettings", {
  guildId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  questChannelId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default GuildSettings;