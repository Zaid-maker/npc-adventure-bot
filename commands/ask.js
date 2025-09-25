const responses = [
  (question, author) => `Hmm... about "${question}"? I'd say fortune favors the bold.`,
  (question, author) => `Ah, ${author}, that reminds me of an old tale...`,
  (question, author) => `You ask of "${question}"? Best bring a sword *and* a shield.`,
  (question) => `A curious question indeed... but answers have a price.`,
  (question) =>
    `I cannot speak much of "${question}", but the whispers in the tavern say otherwise.`,
];

export default {
  name: "ask",
  description: "Ask the NPC a lore-filled question.",
  usage: "!ask <question>",
  async execute(message, { rawArgs }) {
    const question = rawArgs?.trim();
    if (!question) {
      await message.reply("❓ Ask me something like `!ask Where is the blacksmith?`");
      return;
    }

    const formatter = responses[Math.floor(Math.random() * responses.length)];
    const reply = formatter(question, message.author.username);
    await message.reply(reply);
  },
};
