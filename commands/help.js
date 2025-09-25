export default {
    name: "help",
    description: "Show the adventurer’s guide.",
    async execute(message) {
        await message.reply(
            "**📖 Adventurer’s Guide**\n\n" +
                "🗣️ **NPC Interaction**\n" +
                "`!talk` — Chat with the NPC.\n" +
                "`!ask <question>` — Ask the NPC something mysterious.\n\n" +
                "📜 **Quests**\n" +
                "`!board` — View today’s quest board.\n" +
                "`!quest` — Check your progress on the daily quest.\n" +
                "`!complete` — Claim your reward after completing a quest.\n" +
                "`!streak` — See your current streak and bonus.\n\n" +
                "💰 **Economy**\n" +
                "`!balance` — Check your coin balance.\n" +
                "`!trade @user <amount>` — (Coming soon) Gift coins to another adventurer.\n\n" +
                "💡 **Other**\n" +
                "`!help` — Show this adventurer’s guide.\n\n" +
                "✨ More features unlock as the world expands!"
        );
    },
};
