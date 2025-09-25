const replies = [
	"Greetings, traveler. Care to browse my wares?",
	"Ah, I haven’t seen you since the last quest!",
	"The road ahead is dangerous. Do you seek supplies?",
];

export default {
	name: "talk",
	description: "Chat with the NPC merchant.",
	async execute(message) {
		const randomReply = replies[Math.floor(Math.random() * replies.length)];
		await message.reply(randomReply);
	},
};
