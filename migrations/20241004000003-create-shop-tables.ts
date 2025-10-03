import { DataTypes, QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  // Create Items table
  await queryInterface.createTable("Items", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    itemId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Create PlayerInventories table
  await queryInterface.createTable("PlayerInventories", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Add unique index for userId + itemId
  await queryInterface.addIndex("PlayerInventories", ["userId", "itemId"], {
    unique: true,
    name: "player_inventory_user_item_unique",
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("PlayerInventories");
  await queryInterface.dropTable("Items");
}
