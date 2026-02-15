import type { SearchResult } from "../search/vector-search.js";

/**
 * Build context string from search results for the LLM prompt.
 * Presents raw text only — no dates, channels, or citation markers —
 * so the LLM can speak the content as its own words.
 */
export class ContextBuilder {
  /**
   * Build a formatted context string from search results
   */
  build(results: SearchResult[]): string {
    if (results.length === 0) {
      return "（特に関連する過去の発言は見つかりませんでした）";
    }

    // Only include the raw text, separated by blank lines.
    // No metadata (date, channel, reaction count) to prevent the LLM
    // from citing sources or referencing specific posts.
    const contextParts = results.map((result) => result.text);

    return contextParts.join("\n\n");
  }
}
