/**
 * Application configuration loaded from environment variables
 */
export interface AppConfig {
  anthropic: {
    apiKey: string;
    model: string;
  };
  embedding: {
    provider: "openai" | "voyage";
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
 */
export function loadConfig(): AppConfig {
  return {
    anthropic: {
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
    },
    embedding: {
      provider: (process.env.EMBEDDING_PROVIDER as "openai" | "voyage") ?? "openai",
      apiKey: requireEnv("EMBEDDING_API_KEY"),
      model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    },
    slack: {
      botToken: requireEnv("SLACK_BOT_TOKEN"),
      signingSecret: requireEnv("SLACK_SIGNING_SECRET"),
      appToken: process.env.SLACK_APP_TOKEN,
      ceoUserId: process.env.CEO_SLACK_USER_ID ?? "U082DDT76NQ",
      channels: (process.env.SLACK_CHANNELS ?? "C0879M558EB").split(","),
    },
    vectorDb: {
      dbPath: process.env.VECTOR_DB_PATH ?? "./data/vectordb",
    },
    api: {
      port: parseInt(process.env.API_PORT ?? "3000", 10),
      host: process.env.API_HOST ?? "localhost",
    },
    collection: {
      lookbackDays: parseInt(process.env.COLLECTION_LOOKBACK_DAYS ?? "365", 10),
    },
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}
