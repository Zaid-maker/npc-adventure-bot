const TOPICS = [
  {
    id: "magic",
    title: "Arcane Whispers",
    color: 0x8b5cf6,
    keywords: ["magic", "spell", "arcane", "wizard", "sorcery", "mage", "enchant"],
    responses: [
      "Magic is fickle, like a cat with claws made of lightning. Tread softly when you utter those runes.",
      "The ley lines hum louder near the northern cliffs. Cast there, and the sky itself may answer.",
      "Every spell exacts a toll. Pay with mana, blood, or memory—choose wisely, traveler.",
    ],
  },
  {
    id: "battle",
    title: "Battlefield Counsel",
    color: 0xef4444,
    keywords: ["fight", "battle", "sword", "shield", "war", "enemy", "weapon"],
    responses: [
      "Sharpen your blade on experience, not just a whetstone.",
      "A raised shield is worth ten brave words. Never forget to guard before you strike.",
      "Your foes study you as keenly as you study them. Change tactics, or perish repeating history.",
    ],
  },
  {
    id: "treasure",
    title: "Treasure Ledger",
    color: 0xfacc15,
    keywords: ["gold", "treasure", "coin", "wealth", "loot", "fortune", "reward"],
    responses: [
      "Coin clinks loudest when you're alone—keep your purse hidden and your friends closer.",
      "There's a cache buried beneath the old windmill. Bring a shovel and a swift exit plan.",
      "Fortune smiles on those who tip the tavern bard. You never know which verse hides a map.",
    ],
  },
  {
    id: "lore",
    title: "Chronicles of the Realm",
    color: 0x22d3ee,
    keywords: ["king", "queen", "history", "legend", "tale", "story", "ancient"],
    responses: [
      "The first king bargained with a dragon for the throne. Its descendants still expect tribute.",
      "There's a page missing from the royal chronicle—a deliberate gap that reeks of conspiracy.",
      "Ancient runes beneath the city whisper when the moon wanes. Some say it's the old gods dreaming.",
    ],
  },
  {
    id: "mystery",
    title: "Veiled Secrets",
    color: 0x64748b,
    keywords: ["mystery", "secret", "rumor", "hidden", "unknown", "mysterious"],
    responses: [
      "Secrets prefer the dark, yet they always find a way to bask in gossip's torchlight.",
      "Follow the ravens at dusk. They perch only where secrets are stored.",
      "Ask the silent monks no questions; their answers echo inside your skull for days.",
    ],
  },
];

const DEFAULT_RESPONSES = [
  "Hmm... even the archives don't speak plainly on that. Maybe they're hiding something.",
  "Your curiosity is a lantern; let it lead, but beware who follows the light.",
  "The road to that answer is cobbled with favors owed and debts unpaid.",
  "I could tell you, but then you'd owe me a story twice as captivating.",
];

const RUMORS = [
  "A traveling merchant arrived with potions that smell like thunderstorms.",
  "Someone spotted a ghost in the wheat fields, humming lullabies from a forgotten kingdom.",
  "The guild is hiring adventurers discreetly—something about a vault that won't stay locked.",
  "A dragon has been seen bartering in human form at the midnight markets.",
  "There's a hidden door in the tavern's cellar. It only opens for those who knock thrice and laugh twice.",
];

export { TOPICS, DEFAULT_RESPONSES, RUMORS };

export default {
  topics: TOPICS,
  defaults: DEFAULT_RESPONSES,
  rumors: RUMORS,
};
