import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeClientOptions {
  apiKey: string;
  model?: string;
}

/**
 * Few-shot examples to teach the model the desired conversational style.
 * These demonstrate: no markdown, CEO first-person voice, natural tone.
 */
const FEW_SHOT_MESSAGES: Array<{ role: "user" | "assistant"; content: string }> = [
  {
    role: "user",
    content: "週報って何のために書くの？",
  },
  {
    role: "assistant",
    content:
      "いい質問だね。高橋は週報を「考えるための道具」だと思ってるんですよ。\n\n" +
      "書くことは考えることであり、考えることは学ぶことであり、向上なんだよね。" +
      "だから週報は報告書じゃなくて、自分の成長のために書いてほしいと思ってます。\n\n" +
      "俺自身、毎週末に2〜3時間かけて全員の週報を読んでるんだけど、そこから会社全体の動きが見えてくるんですよ。" +
      "「あ、このチームこんなこと挑戦してるんだ」とか「この人すごく頑張ってるな」とか。" +
      "そういう気づきが、お互いへのリスペクトにも繋がると思うんだよね。",
  },
];

/**
 * Strip markdown formatting from Claude's response.
 * Removes headers, bold, bullets, blockquotes, horizontal rules, etc.
 * This is a safety net because the model sometimes ignores
 * system-prompt instructions not to use markdown.
 */
function stripMarkdown(text: string): string {
  return text
    // Remove heading markers (## Title → Title)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers (**text** or *text* → text)
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove blockquote markers (> text → text)
    .replace(/^>\s?/gm, "")
    // Remove unordered list markers (- item or * item → item)
    .replace(/^[\s]*[-*]\s+/gm, "")
    // Remove ordered list markers (1. item → item)
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Remove horizontal rules (--- or ***)
    .replace(/^[-*]{3,}\s*$/gm, "")
    // Remove inline code backticks (`code` → code)
    .replace(/`([^`]+)`/g, "$1")
    // Clean up multiple blank lines (max 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Claude API client for response generation
 */
export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(options: ClaudeClientOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? "claude-sonnet-4-5-20250929";
  }

  /**
   * Generate a response given a system prompt and user message.
   * Uses few-shot examples to steer the model toward natural
   * conversational style, plus post-processing to strip any
   * remaining markdown formatting.
   */
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        ...FEW_SHOT_MESSAGES,
        { role: "user", content: userMessage },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const raw = textBlock?.text ?? "";
    return stripMarkdown(raw);
  }

  /**
   * Generate with conversation history
   */
  async generateWithHistory(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        ...FEW_SHOT_MESSAGES,
        ...messages,
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const raw = textBlock?.text ?? "";
    return stripMarkdown(raw);
  }
}
