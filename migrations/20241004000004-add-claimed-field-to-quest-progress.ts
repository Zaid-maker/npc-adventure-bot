import { DataTypes, QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn("QuestProgresses", "claimed", {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("QuestProgresses", "claimed");
}
