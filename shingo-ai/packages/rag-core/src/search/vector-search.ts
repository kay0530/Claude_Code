import type { ShingoChunk } from "@shingo/shared";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

export interface VectorSearchOptions {
  dbPath: string;
  collectionName?: string;
}

interface StoredChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

/**
 * Local file-based vector search
 * Uses cosine similarity for matching
 * Stores data as JSON files for simplicity
 */
export class VectorSearch {
  private dbPath: string;
  private collectionName: string;
  private chunks: StoredChunk[] = [];
  private loaded = false;

  constructor(options: VectorSearchOptions) {
    this.dbPath = options.dbPath;
    this.collectionName = options.collectionName ?? "shingo_chunks";
  }

  /**
   * Get the file path for the collection
   */
  private get filePath(): string {
    return join(this.dbPath, `${this.collectionName}.json`);
  }

  /**
   * Initialize - load existing data from disk
   */
  async init(): Promise<void> {
    if (this.loaded) return;

    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (existsSync(this.filePath)) {
      const data = readFileSync(this.filePath, "utf-8");
      this.chunks = JSON.parse(data);
    } else {
      this.chunks = [];
    }

    this.loaded = true;
  }

  /**
   * Save current state to disk
   */
  private save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.chunks, null, 2), "utf-8");
  }

  /**
   * Store chunks with their embeddings
   */
  async storeChunks(chunks: ShingoChunk[]): Promise<void> {
    if (!this.loaded) await this.init();

    for (const chunk of chunks) {
      if (!chunk.embedding) {
        throw new Error(`Chunk ${chunk.id} has no embedding`);
      }

      const stored: StoredChunk = {
        id: chunk.id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: chunk.embedding,
        metadata: {
          sourceType: chunk.metadata.sourceType,
          sourceChannel: chunk.metadata.sourceChannel,
          postedAt: chunk.metadata.postedAt instanceof Date
            ? chunk.metadata.postedAt.toISOString()
            : chunk.metadata.postedAt,
          topics: chunk.metadata.topics.join(","),
          reactions: chunk.metadata.reactions,
        },
      };

      // Upsert: replace if exists, add if new
      const existingIndex = this.chunks.findIndex((c) => c.id === chunk.id);
      if (existingIndex >= 0) {
        this.chunks[existingIndex] = stored;
      } else {
        this.chunks.push(stored);
      }
    }

    this.save();
    console.log(`Stored ${chunks.length} chunks in vector DB (total: ${this.chunks.length})`);
  }

  /**
   * Search for similar chunks by query embedding using cosine similarity
   */
  async search(queryEmbedding: number[], topK: number = 5): Promise<SearchResult[]> {
    if (!this.loaded) await this.init();

    if (this.chunks.length === 0) return [];

    // Calculate cosine similarity for all chunks
    const scored = this.chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by similarity (descending) and take top K
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);

    return topResults.map((r) => ({
      id: r.chunk.id,
      text: r.chunk.text,
      score: 1 - r.score, // Convert similarity to distance (lower = better)
      metadata: r.chunk.metadata,
    }));
  }

  /**
   * Get total number of stored chunks
   */
  async count(): Promise<number> {
    if (!this.loaded) await this.init();
    return this.chunks.length;
  }

  /**
   * Delete all data
   */
  async clear(): Promise<void> {
    this.chunks = [];
    this.loaded = true;
    this.save();
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}
