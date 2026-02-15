import OpenAI from "openai";
import type { ShingoChunk } from "@shingo/shared";

/**
 * Common interface for all embedding services
 */
export interface IEmbeddingService {
  embed(text: string): number[] | Promise<number[]>;
  embedBatch(texts: string[]): number[][] | Promise<number[][]>;
  embedChunks(chunks: ShingoChunk[]): ShingoChunk[] | Promise<ShingoChunk[]>;
}

export interface EmbeddingServiceOptions {
  provider: "openai" | "voyage";
  apiKey: string;
  model: string;
}

/**
 * Generate vector embeddings for text chunks
 */
export class EmbeddingService implements IEmbeddingService {
  private client: OpenAI;
  private model: string;

  constructor(options: EmbeddingServiceOptions) {
    const baseURL = options.provider === "voyage"
      ? "https://api.voyageai.com/v1"
      : undefined;

    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL,
    });
    this.model = options.model;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts (batched)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });
      embeddings.push(...response.data.map((d) => d.embedding));
    }

    return embeddings;
  }

  /**
   * Embed chunks and attach embeddings to them
   */
  async embedChunks(chunks: ShingoChunk[]): Promise<ShingoChunk[]> {
    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embedBatch(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));
  }
}
