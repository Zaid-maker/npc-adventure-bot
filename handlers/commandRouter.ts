import { Message } from "discord.js";
import logger from "../utils/logger.js";

const commandLogger = logger.child("CommandRouter");
const commands = new Map<string, Command>();
export const PREFIX = "!";

interface Command {
  name: string;
  aliases?: string[];
  execute: (message: Message, options: CommandExecuteOptions) => Promise<void> | void;
  slashCommandData?: any; // For slash command registration
}

interface CommandExecuteOptions {
  args: string[];
  rawArgs: string;
  prefix: string;
  commandName: string;
}

function addCommand(command: Command): void {
  if (!command || !command.name || typeof command.execute !== "function") {
    throw new Error("Invalid command definition provided to command router.");
  }

  const primaryKey = command.name.toLowerCase();
  commands.set(primaryKey, command);

  if (Array.isArray(command.aliases)) {
    for (const alias of command.aliases) {
      commands.set(alias.toLowerCase(), command);
    }
  }
}

export function registerCommands(commandList: Command[]): void {
  for (const command of commandList) {
    addCommand(command);
  }
}

export function listCommands(): Command[] {
  return [...new Set(commands.values())];
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name.toLowerCase());
}

export async function handleCommand(message: Message): Promise<boolean> {
  if (!message.content.startsWith(PREFIX)) {
    return false;
  }

  const body = message.content.slice(PREFIX.length).trim();
  if (!body) {
    return false;
  }

  const parts = body.split(/\s+/);
  const commandName = parts.shift();
  if (!commandName) {
    return false;
  }

  const command = getCommand(commandName);
  if (!command) {
    return false;
  }

  const rawArgs = parts.join(" ");

  try {
    await command.execute(message, {
      args: parts,
      rawArgs,
      prefix: PREFIX,
      commandName,
    });
  } catch (error) {
    commandLogger.error(`Error executing command ${commandName}:`, error);
    await message.reply("⚠️ There was an error executing that command.");
  }

  return true;
}

export type { Command, CommandExecuteOptions };