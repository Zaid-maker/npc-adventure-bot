import sequelize from "./sequelize.js";
import Item from "./models/Item.js";
import { SHOP_ITEMS } from "./constants/shopItems.js";

(async () => {
  try {
    console.log("🌱 Seeding shop items...");

    for (const item of SHOP_ITEMS) {
      await Item.findOrCreate({
        where: { itemId: item.itemId },
        defaults: item as any,
      });
      console.log(`  ✅ ${item.emoji} ${item.name}`);
    }

    console.log("\n✅ Shop seeded successfully!");
    await sequelize.close();
  } catch (error) {
    console.error("❌ Error seeding shop:", error);
    await sequelize.close();
    process.exit(1);
  }
})();
