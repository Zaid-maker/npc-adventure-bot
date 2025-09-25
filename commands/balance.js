import Player from "../models/Player.js";

export default {
    name: "balance",
    description: "Check how many coins you currently hold.",
    async execute(message) {
        const [player] = await Player.findOrCreate({
            where: { userId: message.author.id },
            defaults: { coins: 0, streak: 0 },
        });

        await message.reply(`💰 ${message.author.username}, your current balance is **${player.coins} coins**.`);
    },
};
