import type { ChatRequest, ChatResponse, ConfidenceLevel } from "@shingo/shared";
import { EmbeddingService } from "./embeddings/embedding-service.js";
import { VectorSearch } from "./search/vector-search.js";
import { ContextBuilder } from "./context/context-builder.js";
import { ClaudeClient } from "./llm/claude-client.js";
import { buildPrompt } from "./prompts/system-prompt.js";
import { randomUUID } from "crypto";

export interface RagEngineOptions {
  embeddingService: EmbeddingService;
  vectorSearch: VectorSearch;
  claudeClient: ClaudeClient;
  topK?: number;
}

/**
 * Main RAG orchestrator - ties together search, context, and generation
 */
export class RagEngine {
  private embedding: EmbeddingService;
  private search: VectorSearch;
  private context: ContextBuilder;
  private claude: ClaudeClient;
  private topK: number;

  constructor(options: RagEngineOptions) {
    this.embedding = options.embeddingService;
    this.search = options.vectorSearch;
    this.context = new ContextBuilder();
    this.claude = options.claudeClient;
    this.topK = options.topK ?? 5;
  }

  /**
   * Process a chat request through the RAG pipeline
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. Generate embedding for the user's question
    const queryEmbedding = await this.embedding.embed(request.message);

    // 2. Search for relevant chunks
    const searchResults = await this.search.search(queryEmbedding, this.topK);

    // 3. Build context from search results
    const contextText = this.context.build(searchResults);

    // 4. Build system prompt with context
    const systemPrompt = buildPrompt(contextText);

    // 5. Generate response with Claude
    const answer = await this.claude.generate(systemPrompt, request.message);

    // 6. Determine confidence based on search results
    const confidence = this.assessConfidence(searchResults);

    // 7. Extract source citations
    const sources = searchResults.map((result) => ({
      text: result.text.slice(0, 200) + (result.text.length > 200 ? "..." : ""),
      channel: (result.metadata.sourceChannel as string) ?? "不明",
      date: (result.metadata.postedAt as string) ?? "不明",
      reactions: (result.metadata.reactions as number) ?? 0,
    }));

    return {
      answer,
      sources,
      confidence,
      conversationId: request.conversationId ?? randomUUID(),
    };
  }

  /**
   * Assess response confidence based on search results quality
   */
  private assessConfidence(results: Array<{ score: number }>): ConfidenceLevel {
    if (results.length === 0) return "low";

    // Lower distance = better match (cosine distance)
    const bestScore = results[0].score;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    if (bestScore < 0.3 && avgScore < 0.5) return "high";
    if (bestScore < 0.5) return "medium";
    return "low";
  }
}
