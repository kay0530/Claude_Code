import { App, LogLevel } from "@slack/bolt";
import { loadConfig } from "@shingo/shared";
import {
  EmbeddingService,
  LocalEmbeddingService,
  VectorSearch,
  ClaudeClient,
  RagEngine,
} from "@shingo/rag-core";
import type { IEmbeddingService } from "@shingo/rag-core";

// Load configuration
const config = loadConfig();

if (!config.slack.appToken) {
  console.error("SLACK_APP_TOKEN is required for Socket Mode.");
  process.exit(1);
}

// Initialize Slack app with Socket Mode
const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  appToken: config.slack.appToken,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// Initialize RAG engine (same setup as API server)
let embeddingService: IEmbeddingService;
if (config.embedding.provider === "local") {
  embeddingService = new LocalEmbeddingService(512);
} else {
  embeddingService = new EmbeddingService({
    provider: config.embedding.provider as "openai" | "voyage",
    apiKey: config.embedding.apiKey,
    model: config.embedding.model,
  });
}

const vectorSearch = new VectorSearch({
  dbPath: config.vectorDb.dbPath,
});

const claudeClient = new ClaudeClient({
  apiKey: config.anthropic.apiKey,
  model: config.anthropic.model,
});

const ragEngine = new RagEngine({
  embeddingService,
  vectorSearch,
  claudeClient,
});

/**
 * Handle direct messages (DM)
 * Responds to any message sent directly to the bot.
 */
app.message(async ({ message, say }) => {
  // Only handle user messages (not bot messages or subtypes)
  if (message.subtype || !("text" in message) || !message.text) {
    return;
  }

  // Ignore messages from bots
  if ("bot_id" in message) {
    return;
  }

  const userText = message.text.trim();
  if (!userText) return;

  console.log(`[DM] Received: "${userText.slice(0, 50)}..."`);

  try {
    const response = await ragEngine.chat({ message: userText });
    await say(response.answer);
    console.log(`[DM] Responded successfully.`);
  } catch (error) {
    console.error("[DM] Error generating response:", error);
    await say(
      "すみません、ちょっと今うまく考えがまとまらなくて。もう一度聞いてもらえますか？"
    );
  }
});

/**
 * Handle @mentions in channels
 * Responds when someone mentions the bot in a channel.
 */
app.event("app_mention", async ({ event, say }) => {
  // Strip the bot mention from the text
  const rawText = event.text ?? "";
  const userText = rawText.replace(/<@[A-Z0-9]+>/g, "").trim();

  if (!userText) {
    await say("何か聞きたいことがあれば、遠慮なくどうぞ！");
    return;
  }

  console.log(`[Mention] Received: "${userText.slice(0, 50)}..."`);

  try {
    const response = await ragEngine.chat({ message: userText });
    await say(response.answer);
    console.log(`[Mention] Responded successfully.`);
  } catch (error) {
    console.error("[Mention] Error generating response:", error);
    await say(
      "すみません、ちょっと今うまく考えがまとまらなくて。もう一度聞いてもらえますか？"
    );
  }
});

// Start the bot
(async () => {
  await app.start();
  console.log("===========================================");
  console.log("  Shingo AI Slack Bot is running!");
  console.log("  Mode: Socket Mode (no public URL needed)");
  console.log("  Listening for: DMs + @mentions");
  console.log("===========================================");
})();
