import chalk, { type ChalkInstance } from "chalk";

interface LogLevel {
  label: string;
  color: ChalkInstance;
  method: (...args: any[]) => void;
}

const LEVEL_CONFIG: Record<string, LogLevel> = {
  debug: { label: "DEBUG", color: chalk.magentaBright, method: console.debug },
  info: { label: "INFO", color: chalk.cyanBright, method: console.log },
  success: { label: "SUCCESS", color: chalk.greenBright, method: console.log },
  warn: { label: "WARN", color: chalk.yellowBright, method: console.warn },
  error: { label: "ERROR", color: chalk.redBright, method: console.error },
};

const LEVEL_ORDER = ["debug", "info", "warn", "error"];

function resolveThreshold(): string {
  const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVEL_ORDER.includes(envLevel) ? envLevel : "info";
}

function shouldLog(level: string): boolean {
  const normalizedLevel = level === "success" ? "info" : level;
  const threshold = resolveThreshold();
  return LEVEL_ORDER.indexOf(normalizedLevel) >= LEVEL_ORDER.indexOf(threshold);
}

function timestamp(): string {
  return chalk.dim(new Date().toISOString());
}

function formatContext(contextParts: string[]): string | null {
  if (!contextParts.length) {
    return null;
  }

  return chalk.gray(contextParts.map((part) => `[${part}]`).join(" "));
}

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  success: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  child: (context?: string) => Logger;
}

function createLogger(contextParts: string[] = []): Logger {
  const log = (level: string, ...args: any[]) => {
    if (!shouldLog(level)) {
      return;
    }

    const config = LEVEL_CONFIG[level];
    if (!config) {
      return;
    }

    const label = config.color.bold(config.label.padEnd(7));
    const contextLabel = formatContext(contextParts);
    const prefixParts = [timestamp(), label];

    if (contextLabel) {
      prefixParts.push(contextLabel);
    }

    const prefix = prefixParts.join(" ");

    if (args.length === 0) {
      config.method(prefix);
    } else {
      config.method(prefix, ...args);
    }
  };

  return {
    debug: (...args) => log("debug", ...args),
    info: (...args) => log("info", ...args),
    success: (...args) => log("success", ...args),
    warn: (...args) => log("warn", ...args),
    error: (...args) => log("error", ...args),
    child: (context?: string) => {
      const nextContext = context ? [...contextParts, context] : contextParts.slice();
      return createLogger(nextContext);
    },
  };
}

const logger = createLogger();

export default logger;
export { createLogger };
export type { Logger };