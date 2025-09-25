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

export default QUEST_POOL;
