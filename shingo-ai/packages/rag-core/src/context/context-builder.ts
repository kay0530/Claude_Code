import type { SearchResult } from "../search/vector-search.js";

/**
 * Build context string from search results for the LLM prompt
 */
export class ContextBuilder {
  /**
   * Build a formatted context string from search results
   */
  build(results: SearchResult[]): string {
    if (results.length === 0) {
      return "（関連する社長の発言が見つかりませんでした）";
    }

    const contextParts = results.map((result, i) => {
      const channel = result.metadata.sourceChannel as string ?? "不明";
      const postedAt = result.metadata.postedAt as string ?? "不明";
      const reactions = result.metadata.reactions as number ?? 0;
      const date = this.formatDate(postedAt);

      return [
        `### 参考${i + 1} (${date} / #${channel} / リアクション: ${reactions})`,
        result.text,
      ].join("\n");
    });

    return contextParts.join("\n\n---\n\n");
  }

  /**
   * Format ISO date string to Japanese date
   */
  private formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    } catch {
      return isoDate;
    }
  }
}
