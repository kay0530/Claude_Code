import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "@shingo/shared";
import { EmbeddingService, VectorSearch, ClaudeClient, RagEngine } from "@shingo/rag-core";
import type { ChatRequest } from "@shingo/shared";
import "dotenv/config";

const app = new Hono();
const config = loadConfig();

// CORS for Chrome extension / web frontend
app.use("/*", cors());

// Initialize RAG engine
const embeddingService = new EmbeddingService({
  provider: config.embedding.provider,
  apiKey: config.embedding.apiKey,
  model: config.embedding.model,
});

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

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "shingo-ai" });
});

// Chat endpoint
app.post("/api/chat", async (c) => {
  const body = await c.req.json<ChatRequest>();

  if (!body.message || body.message.trim().length === 0) {
    return c.json({ error: "Message is required" }, 400);
  }

  try {
    const response = await ragEngine.chat(body);
    return c.json(response);
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// DB stats endpoint
app.get("/api/stats", async (c) => {
  try {
    const chunkCount = await vectorSearch.count();
    return c.json({ totalChunks: chunkCount });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "Failed to get stats" }, 500);
  }
});

// Start server
const port = config.api.port;
console.log(`Shingo AI API server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
