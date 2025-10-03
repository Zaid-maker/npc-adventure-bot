import { DataTypes, QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  // Add lastDailyClaimAt column to Players table
  await queryInterface.addColumn("Players", "lastDailyClaimAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface) {
  // Remove lastDailyClaimAt column from Players table
  await queryInterface.removeColumn("Players", "lastDailyClaimAt");
}
