import { EmbedBuilder, type EmbedFooterOptions, type EmbedAuthorOptions } from "discord.js";

const EMBED_COLORS = {
  primary: 0x38bdf8,
  info: 0x0ea5e9,
  success: 0x22c55e,
  warning: 0xf97316,
  danger: 0xef4444,
  neutral: 0x64748b,
} as const;

interface EmbedOptions {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: EmbedFooterOptions | string | null;
  author?: EmbedAuthorOptions | string | null;
  thumbnail?: string | undefined;
  image?: string;
  url?: string;
  timestamp?: Date | boolean | null;
}

function normalizeFooter(
  footer: EmbedFooterOptions | string | null | undefined,
  commandName?: string,
): EmbedFooterOptions | null {
  if (footer === undefined) {
    if (!commandName) {
      return { text: "NPC Bot" };
    }

    return { text: `NPC Bot • !${commandName}` };
  }

  if (footer === null) {
    return null;
  }

  return typeof footer === "string" ? { text: footer } : footer;
}

function normalizeAuthor(
  author: EmbedAuthorOptions | string | null | undefined,
): EmbedAuthorOptions | null {
  if (!author) {
    return null;
  }

  return typeof author === "string" ? { name: author } : author;
}

function addFields(
  embed: EmbedBuilder,
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }> = [],
): void {
  const filtered = fields.filter((field) => field && field.name && field.value);
  if (filtered.length) {
    embed.addFields(filtered);
  }
}

function resolveTimestamp(timestamp: Date | boolean | null | undefined): Date | null {
  if (timestamp === false) {
    return null;
  }

  if (timestamp === true || timestamp === undefined) {
    return new Date();
  }

  return timestamp;
}

function createEmbed(options: EmbedOptions = {}, commandName?: string): EmbedBuilder {
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

function createCommandEmbed(commandName: string, options: EmbedOptions = {}): EmbedBuilder {
  return createEmbed(options, commandName);
}

export { EMBED_COLORS, createEmbed, createCommandEmbed };
export type { EmbedOptions };
