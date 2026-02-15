/**
 * Data collection and indexing script
 * Usage: npm run collect-data
 *
 * Reads pre-collected CEO messages from local JSON,
 * processes them, generates embeddings, and stores in vector DB.
 *
 * To collect data from Slack via MCP, run: npx tsx scripts/import-mcp-data.ts
 * Then run this script to process and index the data.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { loadConfig } from "@shingo/shared";
import type { ShingoDocument } from "@shingo/shared";
import { TextCleaner, TextChunker, MetadataExtractor } from "@shingo/data-collector";
import { EmbeddingService, LocalEmbeddingService, VectorSearch } from "@shingo/rag-core";
import type { IEmbeddingService } from "@shingo/rag-core";

async function main() {
  console.log("=== Shingo AI Data Collection ===\n");

  const config = loadConfig();

  // Step 1: Load raw documents from local JSON
  console.log("Step 1: Loading raw documents from local JSON...");
  const rawPath = resolve(process.cwd(), "data", "raw-documents.json");
  if (!existsSync(rawPath)) {
    console.error(`Raw data file not found: ${rawPath}`);
    console.error("Run 'npx tsx scripts/import-mcp-data.ts' first to collect data.");
    process.exit(1);
  }

  const rawJson = readFileSync(rawPath, "utf-8");
  const rawDocuments: ShingoDocument[] = JSON.parse(rawJson).map(
    (doc: Record<string, unknown>) => ({
      ...doc,
      postedAt: new Date(doc.postedAt as string),
      collectedAt: new Date(doc.collectedAt as string),
    })
  );
  console.log(`  Loaded ${rawDocuments.length} raw documents\n`);

  // Step 2: Clean text
  console.log("Step 2: Cleaning text...");
  const cleaner = new TextCleaner();
  const cleanedDocuments = rawDocuments
    .map((doc) => ({
      ...doc,
      cleanedText: cleaner.clean(doc.originalText),
    }))
    .filter((doc) => cleaner.isSubstantial(doc.cleanedText));
  console.log(
    `  ${cleanedDocuments.length} substantial documents after cleaning\n`
  );

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
  let embeddingService: IEmbeddingService;
  if (config.embedding.provider === "local") {
    console.log("  Using local embedding (TF-IDF + n-gram hashing)...");
    embeddingService = new LocalEmbeddingService(512);
  } else {
    console.log(`  Using ${config.embedding.provider} API...`);
    embeddingService = new EmbeddingService({
      provider: config.embedding.provider as "openai" | "voyage",
      apiKey: config.embedding.apiKey,
      model: config.embedding.model,
    });
  }
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
