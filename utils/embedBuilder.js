import { EmbedBuilder } from "discord.js";

const EMBED_COLORS = {
  primary: 0x38bdf8,
  info: 0x0ea5e9,
  success: 0x22c55e,
  warning: 0xf97316,
  danger: 0xef4444,
  neutral: 0x64748b,
};

function normalizeFooter(footer, commandName) {
  if (footer === undefined) {
    return commandName ? { text: `NPC Bot • !${commandName}` } : { text: "NPC Bot" };
  }

  if (footer === null) {
    return null;
  }

  return typeof footer === "string" ? { text: footer } : footer;
}

function normalizeAuthor(author) {
  if (!author) {
    return null;
  }

  return typeof author === "string" ? { name: author } : author;
}

function addFields(embed, fields = []) {
  const filtered = fields.filter((field) => field && field.name && field.value);
  if (filtered.length) {
    embed.addFields(filtered);
  }
}

function resolveTimestamp(timestamp) {
  if (timestamp === false) {
    return null;
  }

  if (timestamp === true || timestamp === undefined) {
    return new Date();
  }

  return timestamp;
}

function createEmbed(options = {}, commandName) {
  const {
    title,
    description,
    color = EMBED_COLORS.primary,
    fields,
    footer,
    author,
    thumbnail,
    image,
    url,
    timestamp,
  } = options;

  const embed = new EmbedBuilder().setColor(color);

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  const resolvedTimestamp = resolveTimestamp(timestamp);
  if (resolvedTimestamp) embed.setTimestamp(resolvedTimestamp);

  const footerConfig = normalizeFooter(footer, commandName);
  if (footerConfig) embed.setFooter(footerConfig);

  const authorConfig = normalizeAuthor(author);
  if (authorConfig) embed.setAuthor(authorConfig);

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (url) embed.setURL(url);

  addFields(embed, fields);

  return embed;
}

function createCommandEmbed(commandName, options = {}) {
  return createEmbed(options, commandName);
}

export { EMBED_COLORS, createEmbed, createCommandEmbed };
``;
