/**
 * Test RAG pipeline interactively
 * Usage: npm run test-rag
 *
 * Sends test questions to the RAG engine and displays results.
 */
import { loadConfig } from "@shingo/shared";
import { EmbeddingService, LocalEmbeddingService, VectorSearch, ClaudeClient, RagEngine } from "@shingo/rag-core";
import type { IEmbeddingService } from "@shingo/rag-core";
import * as readline from "readline";

async function main() {
  console.log("=== Shingo AI RAG Test ===\n");

  const config = loadConfig();

  let embeddingService: IEmbeddingService;
  if (config.embedding.provider === "local") {
    embeddingService = new LocalEmbeddingService(512);
  } else {
    embeddingService = new EmbeddingService({
      provider: config.embedding.provider as "openai" | "voyage",
      apiKey: config.embedding.apiKey,
      model: config.embedding.model,
    });
  }

  const vectorSearch = new VectorSearch({
    dbPath: config.vectorDb.dbPath,
  });

  const claudeClient = new ClaudeClient({
    apiKey: config.anthropic.apiKey,
    model: config.anthropic.model,
  });

  const ragEngine = new RagEngine({
    embeddingService,
    vectorSearch,
    claudeClient,
  });

  // Check DB status
  const chunkCount = await vectorSearch.count();
  console.log(`Vector DB contains ${chunkCount} chunks\n`);

  if (chunkCount === 0) {
    console.log("No data in vector DB. Run 'npm run collect-data' first.");
    process.exit(0);
  }

  // Interactive Q&A loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const testQuestions = [
    "社長の給与に対する考え方を教えてください",
    "AIの活用について社長はどう考えていますか？",
    "マーケティング戦略について教えてください",
    "会社の文化や価値観について教えてください",
  ];

  console.log("Test questions available:");
  testQuestions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log("\nType a number to use a test question, or type your own question.");
  console.log('Type "exit" to quit.\n');

  const ask = () => {
    rl.question("Q: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      // Check if input is a number for test questions
      const num = parseInt(input, 10);
      const question = num >= 1 && num <= testQuestions.length
        ? testQuestions[num - 1]
        : input;

      console.log(`\nQuestion: ${question}`);
      console.log("Thinking...\n");

      try {
        const response = await ragEngine.chat({ message: question });

        console.log(`Answer (confidence: ${response.confidence}):`);
        console.log(response.answer);
        console.log("\nSources:");
        response.sources.forEach((s, i) => {
          console.log(`  ${i + 1}. [${s.date}] #${s.channel} (reactions: ${s.reactions})`);
          console.log(`     ${s.text.slice(0, 100)}...`);
        });
        console.log("");
      } catch (error) {
        console.error("Error:", error);
      }

      ask();
    });
  };

  ask();
}

main().catch((error) => {
  console.error("RAG test failed:", error);
  process.exit(1);
});
