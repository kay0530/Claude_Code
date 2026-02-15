import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Application configuration loaded from environment variables
 */
export interface AppConfig {
  anthropic: {
    apiKey: string;
    model: string;
  };
  embedding: {
    provider: "openai" | "voyage" | "local";
    apiKey: string;
    model: string;
  };
  slack: {
    botToken: string;
    signingSecret: string;
    appToken?: string;
    ceoUserId: string;
    channels: string[];
  };
  vectorDb: {
    dbPath: string;
  };
  api: {
    port: number;
    host: string;
  };
  collection: {
    lookbackDays: number;
  };
}

/**
 * Load configuration from environment variables
 * Automatically loads .env file from the project root
 */
export function loadConfig(): AppConfig {
  // Load .env file and merge into a unified env object
  const env = loadEnv();

  return {
    anthropic: {
      apiKey: requireEnv("ANTHROPIC_API_KEY", env),
      model: env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
    },
    embedding: {
      provider: (env.EMBEDDING_PROVIDER as "openai" | "voyage" | "local") ?? "openai",
      apiKey: env.EMBEDDING_PROVIDER === "local" ? "" : requireEnv("EMBEDDING_API_KEY", env),
      model: env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    },
    slack: {
      botToken: requireEnv("SLACK_BOT_TOKEN", env),
      signingSecret: requireEnv("SLACK_SIGNING_SECRET", env),
      appToken: env.SLACK_APP_TOKEN,
      ceoUserId: env.CEO_SLACK_USER_ID ?? "U082DDT76NQ",
      channels: (env.SLACK_CHANNELS ?? "C0879M558EB").split(","),
    },
    vectorDb: {
      dbPath: env.VECTOR_DB_PATH ?? "./data/vectordb",
    },
    api: {
      port: parseInt(env.API_PORT ?? "3000", 10),
      host: env.API_HOST ?? "localhost",
    },
    collection: {
      lookbackDays: parseInt(env.COLLECTION_LOOKBACK_DAYS ?? "365", 10),
    },
  };
}

/**
 * Parse .env file content into key-value pairs
 * Handles comments, empty lines, quotes, and CRLF line endings
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.substring(0, eqIndex).trim();
    let value = line.substring(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Load environment variables from .env file
 * Merges with existing process.env
 */
function loadEnv(): Record<string, string | undefined> {
  // Try loading from current directory and parent directories
  const paths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", ".env"),
  ];

  let parsed: Record<string, string> = {};
  for (const envPath of paths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8");
      parsed = parseEnvFile(content);
      break;
    }
  }

  // Inject into process.env for other libraries that may need it
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  // Build merged env: start with process.env, then override empty values with parsed .env
  const merged: Record<string, string | undefined> = {};
  // First, copy non-empty process.env values
  for (const key of Object.keys(process.env)) {
    const val = process.env[key];
    if (val) {
      merged[key] = val;
    }
  }
  // Then, fill in from parsed .env (parsed values take priority over empty process.env)
  for (const [key, value] of Object.entries(parsed)) {
    if (!merged[key]) {
      merged[key] = value;
    }
  }

  return merged;
}

function requireEnv(name: string, env: Record<string, string | undefined>): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}
