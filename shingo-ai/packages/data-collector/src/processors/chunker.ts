import type { ShingoChunk, ShingoDocument } from "@shingo/shared";

export interface ChunkerOptions {
  maxChunkTokens: number;
  overlapTokens: number;
}

const DEFAULT_OPTIONS: ChunkerOptions = {
  maxChunkTokens: 500,
  overlapTokens: 100,
};

/**
 * Split documents into chunks suitable for embedding
 */
export class TextChunker {
  private options: ChunkerOptions;

  constructor(options: Partial<ChunkerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Split a document into chunks
   */
  chunkDocument(doc: ShingoDocument): ShingoChunk[] {
    const text = doc.cleanedText;

    // Rough token estimation: ~1.5 chars per token for Japanese
    const maxChars = this.options.maxChunkTokens * 1.5;
    const overlapChars = this.options.overlapTokens * 1.5;

    // If text fits in a single chunk, return as-is
    if (text.length <= maxChars) {
      return [this.createChunk(doc, text, 0)];
    }

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    const chunks: ShingoChunk[] = [];
    let currentText = "";
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (currentText.length + paragraph.length > maxChars && currentText.length > 0) {
        // Save current chunk
        chunks.push(this.createChunk(doc, currentText.trim(), chunkIndex));
        chunkIndex++;

        // Keep overlap from end of current chunk
        const overlapStart = Math.max(0, currentText.length - overlapChars);
        currentText = currentText.slice(overlapStart) + "\n\n" + paragraph;
      } else {
        currentText += (currentText ? "\n\n" : "") + paragraph;
      }
    }

    // Save remaining text
    if (currentText.trim()) {
      chunks.push(this.createChunk(doc, currentText.trim(), chunkIndex));
    }

    return chunks;
  }

  /**
   * Chunk multiple documents
   */
  chunkDocuments(docs: ShingoDocument[]): ShingoChunk[] {
    return docs.flatMap((doc) => this.chunkDocument(doc));
  }

  private createChunk(doc: ShingoDocument, text: string, index: number): ShingoChunk {
    return {
      id: `${doc.id}-chunk-${index}`,
      documentId: doc.id,
      chunkIndex: index,
      text,
      metadata: {
        sourceType: doc.sourceType,
        sourceChannel: doc.sourceChannel,
        postedAt: doc.postedAt,
        topics: doc.metadata.topics,
        reactions: doc.metadata.reactions,
      },
    };
  }
}
