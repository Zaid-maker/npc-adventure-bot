import Player from "../models/Player.js";

export default {
  name: "streak",
  description: "View your current daily quest streak.",
  async execute(message) {
    const player = await Player.findOne({ where: { userId: message.author.id } });

    if (!player || player.streak === 0) {
      await message.reply("You haven’t started a streak yet. Complete a quest today!");
      return;
    }

    await message.reply(
      `🔥 Your current streak is **${player.streak} days**.\n` +
        `💰 Bonus per quest: +${player.streak * 5} coins`,
    );
  },
};
