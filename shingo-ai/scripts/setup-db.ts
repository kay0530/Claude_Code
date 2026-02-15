/**
 * Initialize/reset the vector database
 * Usage: npm run setup-db
 */
import "dotenv/config";
import { VectorSearch } from "@shingo/rag-core";

async function main() {
  console.log("=== Shingo AI Database Setup ===\n");

  const dbPath = process.env.VECTOR_DB_PATH ?? "./data/vectordb";

  const vectorSearch = new VectorSearch({
    dbPath,
  });

  // Check if collection exists
  const existingCount = await vectorSearch.count();

  if (existingCount > 0) {
    console.log(`Existing data found: ${existingCount} chunks`);
    console.log("Clearing and reinitializing...");
    await vectorSearch.clear();
  }

  await vectorSearch.init();
  console.log("Vector DB initialized successfully.");
  console.log(`DB path: ${dbPath}`);
  console.log("\nNext step: Run 'npm run collect-data' to collect and index data.");
}

main().catch((error) => {
  console.error("DB setup failed:", error);
  process.exit(1);
});
