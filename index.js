import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import sequelize from "./sequelize.js";
import Quest from "./models/Quest.js";
import QuestProgress from "./models/QuestProgress.js";
import Player from "./models/Player.js";

dotenv.config();

// --- Discord client setup ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- Quest pool (varied difficulty) ---
const QUEST_POOL = [
    // 🟢 Easy
    {
        name: "Greet the Tavern",
        description: "Say hello in chat 3 times today.",
        rewardCoins: 10,
    },
    {
        name: "Talk to NPC 3 times",
        description: "Use !talk with the NPC 3 times today.",
        rewardCoins: 15,
    },
    {
        name: "Send 5 Messages",
        description: "Prove your worth by sending 5 messages in this realm.",
        rewardCoins: 20,
    },
    // 🟡 Medium
    {
        name: "Ask a Question",
        description: "Use !ask to seek wisdom from the NPC at least once.",
        rewardCoins: 25,
    },
    {
        name: "Earn 30 Coins",
        description: "Collect a total of 30 coins (from quests or trading).",
        rewardCoins: 30,
    },
    {
        name: "Check the Quest Board",
        description: "Use !board to read today’s quest board.",
        rewardCoins: 15,
    },
    // 🔴 Hard
    {
        name: "Daily Chat Champion",
        description: "Send at least 20 messages before reset.",
        rewardCoins: 50,
    },
    {
        name: "Generous Spirit",
        description: "Gift coins to another player using !trade (requires economy system).",
        rewardCoins: 40,
    },
    {
        name: "Quest Veteran",
        description: "Complete 3 different quests in a single day.",
        rewardCoins: 75,
    },
];

// --- Helper: get tomorrow midnight ---
function getTomorrowMidnight() {
    const date = new Date();
    date.setHours(24, 0, 0, 0);
    return date;
}

// --- Announce new daily quest ---
async function announceQuest(quest) {
    const channel = await client.channels.fetch(process.env.QUEST_CHANNEL_ID);
    if (!channel) {
        console.warn("⚠️ Quest channel not found. Check QUEST_CHANNEL_ID.");
        return;
    }

    channel.send(
        `📜 **New Daily Quest Appears!**\n\n` +
        `**${quest.name}**\n${quest.description}\n\n` +
        `Reward: ${quest.rewardCoins} coins\n` +
        `⏳ Resets: ${quest.resetAt.toLocaleString()}`
    );
}

// --- Generate new daily quest ---
async function generateDailyQuest() {
    const chosen = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];

    await Quest.destroy({ where: { daily: true } });

    const quest = await Quest.create({
        ...chosen,
        daily: true,
        resetAt: getTomorrowMidnight(),
    });

    console.log(`🌄 New Daily Quest: ${quest.name}`);
    await announceQuest(quest);

    return quest;
}

// --- Daily reset scheduler ---
async function scheduleDailyReset() {
    const now = new Date();
    const tomorrow = getTomorrowMidnight();
    const msUntilReset = tomorrow - now;

    setTimeout(async () => {
        await generateDailyQuest();
        scheduleDailyReset();
    }, msUntilReset);
}

// --- On bot ready ---
client.once("ready", async () => {
    console.log(`🤖 NPC Bot is online as ${client.user.tag}`);

    await sequelize.sync();
    await Quest.sync();
    await QuestProgress.sync();
    await Player.sync();

    const quest = await Quest.findOne({ where: { daily: true } });
    if (!quest || new Date() >= quest.resetAt) {
        await generateDailyQuest();
    }

    scheduleDailyReset();
});

// --- Message handler ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const quest = await Quest.findOne({ where: { daily: true } });

    // --- Progress tracking ---
    if (quest) {
        const [progress] = await QuestProgress.findOrCreate({
            where: { userId: message.author.id, questId: quest.id },
            defaults: { progress: 0 },
        });

        if (
            quest.name === "Send 5 Messages" ||
            quest.name === "Daily Chat Champion" ||
            quest.name === "Greet the Tavern"
        ) {
            progress.progress += 1;
        }

        if (quest.name === "Talk to NPC 3 times" && message.content.startsWith("!talk")) {
            progress.progress += 1;
        }

        if (quest.name === "Ask a Question" && message.content.startsWith("!ask")) {
            progress.progress += 1;
        }

        if (quest.name === "Check the Quest Board" && message.content.startsWith("!board")) {
            progress.progress += 1;
        }

        // Completion checks
        if (
            (quest.name === "Send 5 Messages" && progress.progress >= 5) ||
            (quest.name === "Daily Chat Champion" && progress.progress >= 20) ||
            (quest.name === "Greet the Tavern" && progress.progress >= 3) ||
            (quest.name === "Talk to NPC 3 times" && progress.progress >= 3) ||
            (quest.name === "Ask a Question" && progress.progress >= 1) ||
            (quest.name === "Check the Quest Board" && progress.progress >= 1)
        ) {
            progress.completed = true;
        }

        await progress.save();
    }

    // --- Commands ---
    if (message.content.toLowerCase() === "!talk") {
        const replies = [
            "Greetings, traveler. Care to browse my wares?",
            "Ah, I haven’t seen you since the last quest!",
            "The road ahead is dangerous. Do you seek supplies?",
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        return message.reply(randomReply);
    }

    if (message.content.toLowerCase().startsWith("!ask ")) {
        const question = message.content.slice(5).trim();
        const responses = [
            `Hmm... about "${question}"? I'd say fortune favors the bold.`,
            `Ah, ${message.author.username}, that reminds me of an old tale...`,
            `You ask of "${question}"? Best bring a sword *and* a shield.`,
            `A curious question indeed... but answers have a price.`,
            `I cannot speak much of "${question}", but the whispers in the tavern say otherwise.`,
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return message.reply(randomResponse);
    }

    if (message.content.toLowerCase() === "!board") {
        if (!quest) return message.reply("📜 The quest board is empty for today...");
        return message.reply(
            `📜 **Quest Board**\n\n` +
            `**${quest.name}**\n${quest.description}\n\n` +
            `Reward: ${quest.rewardCoins} coins\n` +
            `⏳ Resets: ${quest.resetAt.toLocaleString()}`
        );
    }

    if (message.content.toLowerCase() === "!quest") {
        if (!quest) return message.reply("📜 No daily quest available.");

        const progress = await QuestProgress.findOne({
            where: { userId: message.author.id, questId: quest.id },
        });

        const progressText = progress
            ? `Progress: ${progress.progress} ${progress.completed ? "(✅ Completed)" : ""}`
            : "Progress: 0";

        return message.reply(
            `📜 **${quest.name}**\n${quest.description}\n\nReward: ${quest.rewardCoins} coins\n${progressText}\n⏳ Resets: ${quest.resetAt.toLocaleString()}`
        );
    }

    if (message.content.toLowerCase() === "!complete") {
        if (!quest) return message.reply("📜 No active quest to complete.");

        const progress = await QuestProgress.findOne({
            where: { userId: message.author.id, questId: quest.id },
        });

        if (!progress) return message.reply("❌ You haven’t started this quest yet.");
        if (!progress.completed) return message.reply(`⏳ You haven’t finished **${quest.name}** yet.`);
        if (progress.claimed) return message.reply("✅ You’ve already claimed this quest’s reward today.");

        progress.claimed = true;
        await progress.save();

        const [player] = await Player.findOrCreate({
            where: { userId: message.author.id },
            defaults: { coins: 0, streak: 0 },
        });

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let bonus = 0;
        if (player.lastCompletedAt) {
            const last = new Date(player.lastCompletedAt);
            if (last.toDateString() === yesterday.toDateString()) {
                player.streak += 1;
            } else if (last.toDateString() !== today.toDateString()) {
                player.streak = 1;
            }
        } else {
            player.streak = 1;
        }

        bonus = player.streak * 5;

        player.coins += quest.rewardCoins + bonus;
        player.lastCompletedAt = today;
        await player.save();

        return message.reply(
            `🎉 Quest complete! You earned **${quest.rewardCoins} coins** + streak bonus **${bonus} coins**.\n` +
            `🔥 Current streak: ${player.streak} days\n` +
            `💰 Total balance: ${player.coins} coins`
        );
    }

    if (message.content.toLowerCase() === "!streak") {
        const player = await Player.findOne({ where: { userId: message.author.id } });
        if (!player || player.streak === 0) {
            return message.reply("You haven’t started a streak yet. Complete a quest today!");
        }
        return message.reply(
            `🔥 Your current streak is **${player.streak} days**.\n💰 Bonus per quest: +${player.streak * 5} coins`
        );
    }

    if (message.content.toLowerCase() === "!help") {
        return message.reply(
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
            "`!balance` — (Coming soon) Check your coin balance.\n" +
            "`!trade @user <amount>` — (Coming soon) Gift coins to another adventurer.\n\n" +

            "💡 **Other**\n" +
            "`!help` — Show this adventurer’s guide.\n\n" +

            "✨ More features unlock as the world expands!"
        );
    }


});

client.login(process.env.DISCORD_TOKEN);
