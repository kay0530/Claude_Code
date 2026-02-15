/**
 * Source type for collected documents
 */
export type SourceType = "slack" | "salesforce";

/**
 * Raw document collected from data sources
 */
export interface ShingoDocument {
  id: string;
  sourceType: SourceType;
  sourceChannel: string;
  sourceChannelId: string;
  authorId: string;
  authorName: string;
  originalText: string;
  cleanedText: string;
  postedAt: Date;
  collectedAt: Date;
  metadata: DocumentMetadata;
}

/**
 * Metadata associated with a document
 */
export interface DocumentMetadata {
  reactions: number;
  threadReplies: number;
  hasAttachments: boolean;
  mentionedUsers: string[];
  topics: string[];
  threadMessages?: ThreadMessage[];
}

/**
 * A reply within a thread
 */
export interface ThreadMessage {
  authorId: string;
  authorName: string;
  text: string;
  postedAt: Date;
}

/**
 * A chunk of text for vector embedding
 */
export interface ShingoChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

/**
 * Metadata for a chunk
 */
export interface ChunkMetadata {
  sourceType: SourceType;
  sourceChannel: string;
  postedAt: Date;
  topics: string[];
  reactions: number;
}

/**
 * Chat request from frontend
 */
export interface ChatRequest {
  message: string;
  conversationId?: string;
}

/**
 * Chat response to frontend
 */
export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  confidence: ConfidenceLevel;
  conversationId: string;
}

/**
 * Source citation in a response
 */
export interface SourceCitation {
  text: string;
  channel: string;
  date: string;
  reactions: number;
}

/**
 * Confidence level of a response
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Collection status for tracking incremental updates
 */
export interface CollectionStatus {
  sourceType: SourceType;
  channelId: string;
  lastCollectedAt: Date;
  lastMessageTs: string;
  totalDocuments: number;
  totalChunks: number;
}
