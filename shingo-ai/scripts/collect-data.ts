/**
 * Manual data collection script
 * Usage: npm run collect-data
 *
 * Collects CEO messages from Slack, processes them,
 * generates embeddings, and stores in vector DB.
 */
import "dotenv/config";
import { loadConfig } from "@shingo/shared";
import { SlackCollector, TextCleaner, TextChunker, MetadataExtractor } from "@shingo/data-collector";
import { EmbeddingService, VectorSearch } from "@shingo/rag-core";

async function main() {
  console.log("=== Shingo AI Data Collection ===\n");

  const config = loadConfig();

  // Step 1: Collect from Slack
  console.log("Step 1: Collecting messages from Slack...");
  const slackCollector = new SlackCollector({
    botToken: config.slack.botToken,
    ceoUserId: config.slack.ceoUserId,
    channels: config.slack.channels,
    lookbackDays: config.collection.lookbackDays,
  });

  const rawDocuments = await slackCollector.collectAll();
  console.log(`  Collected ${rawDocuments.length} raw documents\n`);

  // Step 2: Clean text
  console.log("Step 2: Cleaning text...");
  const cleaner = new TextCleaner();
  const cleanedDocuments = rawDocuments.map((doc) => ({
    ...doc,
    cleanedText: cleaner.clean(doc.originalText),
  })).filter((doc) => cleaner.isSubstantial(doc.cleanedText));
  console.log(`  ${cleanedDocuments.length} substantial documents after cleaning\n`);

  // Step 3: Extract metadata / topics
  console.log("Step 3: Extracting metadata...");
  const extractor = new MetadataExtractor();
  const enrichedDocuments = extractor.enrichDocuments(cleanedDocuments);
  const topicCounts: Record<string, number> = {};
  for (const doc of enrichedDocuments) {
    for (const topic of doc.metadata.topics) {
      topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
    }
  }
  console.log("  Topic distribution:", topicCounts, "\n");

  // Step 4: Chunk documents
  console.log("Step 4: Chunking documents...");
  const chunker = new TextChunker();
  const chunks = chunker.chunkDocuments(enrichedDocuments);
  console.log(`  Generated ${chunks.length} chunks\n`);

  // Step 5: Generate embeddings
  console.log("Step 5: Generating embeddings...");
  const embeddingService = new EmbeddingService({
    provider: config.embedding.provider,
    apiKey: config.embedding.apiKey,
    model: config.embedding.model,
  });
  const embeddedChunks = await embeddingService.embedChunks(chunks);
  console.log(`  Generated embeddings for ${embeddedChunks.length} chunks\n`);

  // Step 6: Store in vector DB
  console.log("Step 6: Storing in vector DB...");
  const vectorSearch = new VectorSearch({
    dbPath: config.vectorDb.dbPath,
  });
  await vectorSearch.storeChunks(embeddedChunks);

  const totalCount = await vectorSearch.count();
  console.log(`  Total chunks in DB: ${totalCount}\n`);

  console.log("=== Data collection complete! ===");
}

main().catch((error) => {
  console.error("Data collection failed:", error);
  process.exit(1);
});
