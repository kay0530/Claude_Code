import type { ShingoChunk } from "@shingo/shared";
import type { IEmbeddingService } from "./embedding-service.js";

/**
 * Local embedding service using TF-IDF + character n-gram hashing
 * No external API required - runs entirely locally
 *
 * Uses a combination of:
 * 1. Character n-gram hashing for capturing word-level similarity
 * 2. Token frequency weighting for document-level relevance
 */
export class LocalEmbeddingService implements IEmbeddingService {
  private dimension: number;

  constructor(dimension = 512) {
    this.dimension = dimension;
  }

  /**
   * Generate embedding for a single text
   */
  embed(text: string): number[] {
    return this.textToVector(text);
  }

  /**
   * Generate embeddings for multiple texts
   */
  embedBatch(texts: string[]): number[][] {
    return texts.map((t) => this.textToVector(t));
  }

  /**
   * Embed chunks and attach embeddings to them
   */
  embedChunks(chunks: ShingoChunk[]): ShingoChunk[] {
    const texts = chunks.map((c) => c.text);
    const embeddings = this.embedBatch(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));
  }

  /**
   * Convert text to a fixed-dimensional vector using character n-gram hashing
   */
  private textToVector(text: string): number[] {
    const vector = new Float64Array(this.dimension);

    // Normalize text
    const normalized = text
      .toLowerCase()
      .replace(/[、。！？「」『』（）\s]+/g, " ")
      .trim();

    // Extract tokens (Japanese characters + words)
    const tokens = this.tokenize(normalized);

    // Generate character n-grams (bigrams and trigrams)
    const ngrams: string[] = [];
    for (const token of tokens) {
      // Unigrams (individual tokens)
      ngrams.push(token);

      // Character bigrams within tokens
      for (let i = 0; i < token.length - 1; i++) {
        ngrams.push(token.substring(i, i + 2));
      }

      // Character trigrams within tokens
      for (let i = 0; i < token.length - 2; i++) {
        ngrams.push(token.substring(i, i + 3));
      }
    }

    // Word-level bigrams (pairs of adjacent tokens)
    for (let i = 0; i < tokens.length - 1; i++) {
      ngrams.push(`${tokens[i]}_${tokens[i + 1]}`);
    }

    // Hash each n-gram into the vector space
    for (const ngram of ngrams) {
      const hash1 = this.hashString(ngram, 0);
      const hash2 = this.hashString(ngram, 1);
      const idx = Math.abs(hash1) % this.dimension;
      // Use hash2 to determine sign (+1 or -1) for better distribution
      const sign = hash2 % 2 === 0 ? 1 : -1;
      vector[idx] += sign;
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] /= norm;
      }
    }

    return Array.from(vector);
  }

  /**
   * Tokenize text into meaningful units
   * Handles both Japanese and English text
   */
  private tokenize(text: string): string[] {
    const tokens: string[] = [];

    // Split by spaces and punctuation for basic tokenization
    const parts = text.split(/[\s,.:;!?()[\]{}"']+/);

    for (const part of parts) {
      if (!part) continue;

      // For Japanese text, split into individual characters and small groups
      if (/[\u3000-\u9fff\uff00-\uffef]/.test(part)) {
        // Add the full part as a token
        tokens.push(part);

        // Also split into 2-character and 3-character windows
        for (let i = 0; i < part.length; i++) {
          tokens.push(part[i]);
          if (i < part.length - 1) {
            tokens.push(part.substring(i, i + 2));
          }
        }
      } else {
        // English/ASCII: add as-is
        if (part.length > 1) {
          tokens.push(part);
        }
      }
    }

    return tokens;
  }

  /**
   * Simple string hash function (FNV-1a variant)
   */
  private hashString(str: string, seed: number): number {
    let hash = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) | 0;
    }
    return hash;
  }
}
