// index.js
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { Op } from "sequelize";
import { Player, Item, PlayerItem, Quest, PlayerQuest } from "./db.js";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ⏳ Midnight helper
function getTomorrowMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
}

// 🎲 Quest templates
const QUEST_POOL = [
    // 🟢 Easy (daily habits)
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

    // 🟡 Medium (engagement & commands)
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

    // 🔴 Harder (grindy / cooperative flavor)
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


async function announceQuest(quest) {
    const channel = await client.channels.fetch(process.env.QUEST_CHANNEL_ID);

    if (!channel) {
        console.warn("⚠️ Quest channel not found. Set QUEST_CHANNEL_ID in .env");
        return;
    }

    channel.send(
        `📜 **New Daily Quest Appears!**\n\n` +
        `**${quest.name}**\n${quest.description}\n\n` +
        `Reward: ${quest.rewardCoins} coins\n` +
        `⏳ Resets: ${quest.resetAt.toLocaleString()}`
    );
}

// 🎲 Pick random quest
async function generateDailyQuest() {
    const chosen = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];

    // delete old daily quests
    await Quest.destroy({ where: { daily: true } });

    // create new daily quest
    const quest = await Quest.create({
        ...chosen,
        daily: true,
        resetAt: getTomorrowMidnight(),
    });

    console.log(`🌄 New Daily Quest: ${quest.name}`);

    // announce in channel
    await announceQuest(quest);

    return quest;
}

client.once("ready", async () => {
    console.log(`🤖 NPC Bot is online as ${client.user.tag}`);

    await QuestProgress.sync();

    // preload shop items
    const items = [
        {
            name: "Rusty Sword",
            description: "Barely sharp, but better than fists.",
            price: 20,
        },
        {
            name: "Healing Potion",
            description: "Restores your courage instantly.",
            price: 10,
        },
    ];
    for (const i of items) {
        await Item.findOrCreate({ where: { name: i.name }, defaults: i });
    }

    // if no daily quest exists, generate one
    const existing = await Quest.findOne({ where: { daily: true } });
    if (!existing) {
        await generateDailyQuest();
    }

    // ⏳ Reset cycle
    setInterval(async () => {
        const now = new Date();

        const dueQuests = await Quest.findAll({
            where: {
                daily: true,
                [Op.or]: [{ resetAt: null }, { resetAt: { [Op.lte]: now } }],
            },
        });

        for (const quest of dueQuests) {
            console.log(`🔄 Resetting daily quests...`);
            await PlayerQuest.update(
                { progress: 0, completed: false },
                { where: { QuestId: quest.id } }
            );

            // create a brand-new random quest
            await generateDailyQuest();
        }
    }, 60 * 1000);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const quest = await Quest.findOne({ where: { daily: true } });
    if (!quest) return;

    // Find or create progress for this user
    const [progress] = await QuestProgress.findOrCreate({
        where: { userId: message.author.id, questId: quest.id },
        defaults: { progress: 0 },
    });

    // Example quest tracking logic
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

    // Mark complete if requirements met
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

    // --- Commands ---

    // !quest
    if (message.content.toLowerCase() === "!quest") {
        const quest = await Quest.findOne({ where: { daily: true } });
        if (!quest) return message.reply("📜 No daily quest available.");

        const progress = await QuestProgress.findOne({
            where: { userId: message.author.id, questId: quest.id },
        });

        const progressText = progress
            ? `Progress: ${progress.progress} ${progress.completed ? "(✅ Completed)" : ""
            }`
            : "Progress: 0";

        return message.reply(
            `📜 **${quest.name}**\n${quest.description}\n\nReward: ${quest.rewardCoins} coins\n${progressText}\n⏳ Resets: ${quest.resetAt.toLocaleString()}`
        );
    }


    // !complete
    if (message.content.toLowerCase() === "!complete") {
        // Mark as claimed + reward player
        progress.claimed = true;
        await progress.save();

        const [player] = await Player.findOrCreate({
            where: { userId: message.author.id },
            defaults: { coins: 0, streak: 0 },
        });

        // --- Streak calculation ---
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let bonus = 0;

        if (player.lastCompletedAt) {
            const last = new Date(player.lastCompletedAt);

            // If last completed quest was yesterday, increment streak
            if (
                last.toDateString() === yesterday.toDateString()
            ) {
                player.streak += 1;
            }
            // If last was today, do nothing (already completed once)
            else if (last.toDateString() === today.toDateString()) {
                // shouldn't happen since claimed is unique per quest
            }
            // Missed a day → reset streak
            else {
                player.streak = 1;
            }
        } else {
            // First quest ever
            player.streak = 1;
        }

        // Bonus: +5 coins × streak
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

    // !talk
    if (message.content.toLowerCase() === "!talk") {
        const replies = [
            `Greetings, ${player.username}. You currently have ${player.coins} coins.`,
            "Ah, I haven’t seen you since the last quest!",
            "The road ahead is dangerous. Do you seek supplies?",
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        return message.reply(randomReply);
    }

    // !ask
    if (message.content.toLowerCase().startsWith("!ask ")) {
        const question = message.content.slice(5).trim();

        const responses = [
            `About "${question}"? I'd say fortune favors the bold.`,
            `Ah, ${player.username}, that reminds me of an old tale...`,
            `You ask of "${question}"? Best bring a sword *and* a shield.`,
        ];

        const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];
        await message.reply(randomResponse);

        player.coins += 5;
        player.lastInteraction = new Date();
        await player.save();
    }

    // !shop
    if (message.content.toLowerCase() === "!shop") {
        const items = await Item.findAll();
        const shopText = items
            .map((i) => `**${i.name}** - ${i.price} coins\n*${i.description}*`)
            .join("\n\n");
        return message.reply(`🏪 **Shop Items**:\n\n${shopText}`);
    }

    // !buy <item>
    if (message.content.toLowerCase().startsWith("!buy ")) {
        const itemName = message.content.slice(5).trim();
        const item = await Item.findOne({ where: { name: itemName } });
        if (!item) return message.reply("That item doesn’t exist.");

        if (player.coins < item.price) {
            return message.reply("You don’t have enough coins.");
        }

        player.coins -= item.price;
        await player.save();

        let [pi] = await PlayerItem.findOrCreate({
            where: { PlayerId: player.id, ItemId: item.id },
        });
        pi.quantity += 1;
        await pi.save();

        return message.reply(
            `✅ You bought **${item.name}** for ${item.price} coins.`
        );
    }

    // !inventory
    if (message.content.toLowerCase() === "!inventory") {
        const inventory = await player.getItems();
        if (inventory.length === 0)
            return message.reply("Your inventory is empty.");

        const invText = inventory
            .map((i) => `${i.name} x${i.PlayerItem.quantity}`)
            .join("\n");

        return message.reply(`🎒 **Your Inventory**:\n${invText}`);
    }

    // !board
    if (message.content.toLowerCase() === "!board") {
        const quest = await Quest.findOne({ where: { daily: true } });
        if (!quest) return message.reply("📜 The quest board is empty for today...");

        return message.reply(
            `📜 **Quest Board**\n\n` +
            `**${quest.name}**\n${quest.description}\n\n` +
            `Reward: ${quest.rewardCoins} coins\n` +
            `⏳ Resets: ${quest.resetAt.toLocaleString()}`
        );
    }

    // !streak
    if (message.content.toLowerCase() === "!streak") {
        const player = await Player.findOne({ where: { userId: message.author.id } });
        if (!player || player.streak === 0) {
            return message.reply("You haven’t started a streak yet. Complete a quest today!");
        }

        return message.reply(
            `🔥 Your current streak is **${player.streak} days**.\n` +
            `💰 Bonus per quest: +${player.streak * 5} coins`
        );
    }

});

client.login(process.env.DISCORD_TOKEN);
