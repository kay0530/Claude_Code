import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeClientOptions {
  apiKey: string;
  model?: string;
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
   * Generate a response given a system prompt and user message
   */
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
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
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
  }
}
