import { WebClient } from "@slack/web-api";
import type { ShingoDocument, DocumentMetadata, ThreadMessage } from "@shingo/shared";

export interface SlackCollectorOptions {
  botToken: string;
  ceoUserId: string;
  channels: string[];
  lookbackDays: number;
}

export class SlackCollector {
  private client: WebClient;
  private ceoUserId: string;
  private channels: string[];
  private lookbackDays: number;

  constructor(options: SlackCollectorOptions) {
    this.client = new WebClient(options.botToken);
    this.ceoUserId = options.ceoUserId;
    this.channels = options.channels;
    this.lookbackDays = options.lookbackDays;
  }

  /**
   * Collect all CEO messages from configured channels
   */
  async collectAll(sinceTs?: string): Promise<ShingoDocument[]> {
    const documents: ShingoDocument[] = [];

    for (const channelId of this.channels) {
      const channelDocs = await this.collectFromChannel(channelId, sinceTs);
      documents.push(...channelDocs);
    }

    return documents;
  }

  /**
   * Collect CEO messages from a specific channel
   */
  async collectFromChannel(channelId: string, sinceTs?: string): Promise<ShingoDocument[]> {
    const documents: ShingoDocument[] = [];
    const oldestTs = sinceTs ?? this.calculateOldestTs();
    let cursor: string | undefined;

    // Get channel info for naming
    const channelName = await this.getChannelName(channelId);

    do {
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest: oldestTs,
        limit: 100,
        cursor,
      });

      if (!result.messages) break;

      for (const message of result.messages) {
        // Filter to CEO's messages only
        if (message.user !== this.ceoUserId) continue;
        if (!message.text || !message.ts) continue;

        // Fetch thread replies if any
        const threadMessages = await this.fetchThreadReplies(channelId, message.ts);

        const doc = this.messageToDocument(message, channelId, channelName, threadMessages);
        documents.push(doc);
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    console.log(`Collected ${documents.length} CEO messages from #${channelName}`);
    return documents;
  }

  /**
   * Fetch thread replies for a message
   */
  private async fetchThreadReplies(channelId: string, threadTs: string): Promise<ThreadMessage[]> {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        limit: 100,
      });

      if (!result.messages || result.messages.length <= 1) return [];

      // Skip the parent message (first element)
      return result.messages.slice(1).map((reply) => ({
        authorId: reply.user ?? "unknown",
        authorName: reply.user ?? "unknown",
        text: reply.text ?? "",
        postedAt: new Date(parseFloat(reply.ts ?? "0") * 1000),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Convert a Slack message to a ShingoDocument
   */
  private messageToDocument(
    message: Record<string, unknown>,
    channelId: string,
    channelName: string,
    threadMessages: ThreadMessage[]
  ): ShingoDocument {
    const ts = message.ts as string;
    const text = message.text as string;
    const reactions = message.reactions as Array<{ count: number }> | undefined;
    const replyCount = (message.reply_count as number) ?? 0;
    const files = message.files as unknown[] | undefined;

    const totalReactions = reactions?.reduce((sum, r) => sum + r.count, 0) ?? 0;

    const metadata: DocumentMetadata = {
      reactions: totalReactions,
      threadReplies: replyCount,
      hasAttachments: !!files && files.length > 0,
      mentionedUsers: this.extractMentions(text),
      topics: [],
      threadMessages,
    };

    return {
      id: `slack-${channelId}-${ts}`,
      sourceType: "slack",
      sourceChannel: channelName,
      sourceChannelId: channelId,
      authorId: this.ceoUserId,
      authorName: "Takahashi Shingo",
      originalText: text,
      cleanedText: text, // Will be processed by TextCleaner
      postedAt: new Date(parseFloat(ts) * 1000),
      collectedAt: new Date(),
      metadata,
    };
  }

  /**
   * Extract @mentioned user IDs from message text
   */
  private extractMentions(text: string): string[] {
    const mentionPattern = /<@([A-Z0-9]+)>/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  /**
   * Get channel display name
   */
  private async getChannelName(channelId: string): Promise<string> {
    try {
      const result = await this.client.conversations.info({ channel: channelId });
      return (result.channel as { name?: string })?.name ?? channelId;
    } catch {
      return channelId;
    }
  }

  /**
   * Calculate oldest timestamp based on lookback period
   */
  private calculateOldestTs(): string {
    const lookbackMs = this.lookbackDays * 24 * 60 * 60 * 1000;
    const oldestDate = new Date(Date.now() - lookbackMs);
    return (oldestDate.getTime() / 1000).toString();
  }
}
