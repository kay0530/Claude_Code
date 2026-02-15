/**
 * Import Slack messages from MCP tool result files
 * Parses the text-based format and converts to ShingoDocument format
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import type { ShingoDocument, DocumentMetadata } from "@shingo/shared";

const CEO_USER_ID = "U082DDT76NQ";
const CHANNEL_ID = "C0879M558EB";
const CHANNEL_NAME = "社長の呟き";

interface ParsedMessage {
  userId: string;
  username: string;
  timestamp: string;
  messageTs: string;
  text: string;
  threadReplies: number;
  reactions: string[];
}

/**
 * Parse MCP slack_read_channel result file
 */
function parseMcpResultFile(filePath: string): ParsedMessage[] {
  const raw = readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);

  // Extract the text content from JSON wrapper
  const textContent = json[0]?.text;
  if (!textContent) return [];

  // Parse the inner JSON to get the messages string
  let messagesText: string;
  try {
    const parsed = JSON.parse(textContent);
    messagesText = parsed.messages || textContent;
  } catch {
    messagesText = textContent;
  }

  const messages: ParsedMessage[] = [];

  // Split by message separator pattern (actual newlines, not escaped)
  const messageBlocks = messagesText.split(/\n=== Message from /);

  for (let i = 0; i < messageBlocks.length; i++) {
    let block = messageBlocks[i];
    // First block starts with "=== Message from " without leading newline
    if (i === 0) {
      if (block.startsWith("=== Message from ")) {
        block = block.substring("=== Message from ".length);
      } else {
        continue;
      }
    }
    if (!block.trim()) continue;

    // Parse header: "username (USERID) at YYYY-MM-DD HH:MM:SS TZ ==="
    const headerMatch = block.match(
      /^(.+?) \(([A-Z0-9]+)\) at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]+) ===/
    );
    if (!headerMatch) continue;

    const username = headerMatch[1];
    const userId = headerMatch[2];
    const timestamp = headerMatch[3];

    // Parse Message TS
    const tsMatch = block.match(/Message TS: ([0-9.]+)/);
    const messageTs = tsMatch?.[1] ?? "";

    // Extract message text: everything between "Message TS:" line and metadata lines
    const lines = block.split("\n");
    const textLines: string[] = [];
    let foundTs = false;
    let threadReplies = 0;
    const reactions: string[] = [];

    for (const line of lines) {
      if (line.startsWith("Message TS:")) {
        foundTs = true;
        continue;
      }
      if (!foundTs) continue;

      // Check for thread info (🧵)
      if (line.includes("Thread:") && line.match(/(\d+) repl/)) {
        const threadMatch = line.match(/(\d+) repl/);
        if (threadMatch) {
          threadReplies = parseInt(threadMatch[1], 10);
        }
        continue;
      }

      // Check for reactions
      if (line.includes("Reactions:")) {
        const reactionText = line.replace(/.*Reactions:\s*/, "");
        if (reactionText) reactions.push(reactionText);
        continue;
      }

      // Skip context before/after markers
      if (
        line.startsWith("Context before:") ||
        line.startsWith("Context after:") ||
        line.match(/^\s+- From:/)
      ) {
        break;
      }

      textLines.push(line);
    }

    const text = textLines.join("\n").trim();

    if (text && messageTs) {
      messages.push({
        userId,
        username,
        timestamp,
        messageTs,
        text,
        threadReplies,
        reactions,
      });
    }
  }

  return messages;
}

/**
 * Convert parsed messages to ShingoDocument format
 */
function toShingoDocuments(messages: ParsedMessage[]): ShingoDocument[] {
  return messages
    .filter((m) => m.userId === CEO_USER_ID)
    .map((m) => {
      const metadata: DocumentMetadata = {
        reactions: 0,
        threadReplies: m.threadReplies,
        hasAttachments: false,
        mentionedUsers: extractMentions(m.text),
        topics: [],
        threadMessages: [],
      };

      return {
        id: `slack-${CHANNEL_ID}-${m.messageTs}`,
        sourceType: "slack" as const,
        sourceChannel: CHANNEL_NAME,
        sourceChannelId: CHANNEL_ID,
        authorId: CEO_USER_ID,
        authorName: "Takahashi Shingo",
        originalText: m.text,
        cleanedText: m.text,
        postedAt: new Date(parseFloat(m.messageTs) * 1000),
        collectedAt: new Date(),
        metadata,
      };
    });
}

function extractMentions(text: string): string[] {
  const mentionPattern = /<@([A-Z0-9]+)>/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

async function main() {
  console.log("=== Import MCP Slack Data ===\n");

  // Find MCP result files
  const projectDir =
    "C:\\Users\\田中　圭亮\\.claude\\projects\\C--Users-------Desktop-Claude-Code-Demo--claude-worktrees-kind-black\\aea00f5f-0b37-4608-a264-d9c8d0008c87\\tool-results";

  const files = [
    "mcp-c482df70-eab1-4eec-88a5-9e81651a9c5f-slack_read_channel-1771116952407.txt",
    "mcp-c482df70-eab1-4eec-88a5-9e81651a9c5f-slack_read_channel-1771117014827.txt",
  ];

  let allMessages: ParsedMessage[] = [];

  for (const file of files) {
    const filePath = resolve(projectDir, file);
    if (!existsSync(filePath)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    const messages = parseMcpResultFile(filePath);
    console.log(`Parsed ${messages.length} messages from ${file}`);
    allMessages.push(...messages);
  }

  // Deduplicate by messageTs
  const seen = new Set<string>();
  allMessages = allMessages.filter((m) => {
    if (seen.has(m.messageTs)) return false;
    seen.add(m.messageTs);
    return true;
  });

  console.log(`\nTotal unique messages: ${allMessages.length}`);
  console.log(
    `CEO messages: ${allMessages.filter((m) => m.userId === CEO_USER_ID).length}`
  );

  // Convert to ShingoDocument format
  const documents = toShingoDocuments(allMessages);
  console.log(`\nConverted to ${documents.length} ShingoDocuments`);

  // Save to data directory
  const dataDir = resolve(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = resolve(dataDir, "raw-documents.json");
  writeFileSync(outputPath, JSON.stringify(documents, null, 2), "utf-8");
  console.log(`\nSaved to: ${outputPath}`);

  // Show sample
  if (documents.length > 0) {
    console.log("\n--- Sample Documents ---");
    for (const doc of documents.slice(0, 3)) {
      console.log(`\nID: ${doc.id}`);
      console.log(`Date: ${doc.postedAt}`);
      console.log(
        `Text (first 150 chars): ${doc.originalText.substring(0, 150)}...`
      );
    }
    console.log(`\n--- Date Range ---`);
    const dates = documents.map((d) => d.postedAt);
    console.log(`Oldest: ${new Date(Math.min(...dates.map((d) => d.getTime())))}`);
    console.log(`Newest: ${new Date(Math.max(...dates.map((d) => d.getTime())))}`);
  }
}

main().catch(console.error);
