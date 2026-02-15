/**
 * Clean and normalize Slack message text for RAG processing
 */
export class TextCleaner {
  /**
   * Clean a raw Slack message text
   */
  clean(text: string): string {
    let cleaned = text;

    // Remove Slack user mentions and replace with placeholder
    cleaned = cleaned.replace(/<@[A-Z0-9]+>/g, "[ユーザー]");

    // Remove Slack channel references and replace with channel name
    cleaned = cleaned.replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1");
    cleaned = cleaned.replace(/<#[A-Z0-9]+>/g, "[チャンネル]");

    // Remove URL formatting but keep the URL text
    cleaned = cleaned.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2");
    cleaned = cleaned.replace(/<(https?:\/\/[^>]+)>/g, "$1");

    // Remove special Slack tokens
    cleaned = cleaned.replace(/<!here>/g, "@here");
    cleaned = cleaned.replace(/<!channel>/g, "@channel");
    cleaned = cleaned.replace(/<!everyone>/g, "@everyone");
    cleaned = cleaned.replace(/<!subteam\^[A-Z0-9]+\|([^>]+)>/g, "@$1");

    // Normalize whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Check if the text has enough content for RAG
   */
  isSubstantial(text: string, minLength: number = 50): boolean {
    return text.length >= minLength;
  }
}
