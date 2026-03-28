import type { LLMAdapter, LLMGenerateInput, LLMStream } from "./types.js";
import { streamFromText } from "./tokens.js";

export class MockLLMAdapter implements LLMAdapter {
  public readonly provider = "mock";

  streamChat(input: LLMGenerateInput): LLMStream {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const response =
      `Got it. Here’s a streaming answer based on the conversation so far.\n\n` +
      `You said: "${lastUser.trim()}".\n\n` +
      `If you want the best transport choice:\n` +
      `- SSE is great for simple server→client token streams.\n` +
      `- WebSockets are better for full duplex sessions (interruptions, tool calls, barge-in).\n\n` +
      `Ask me to explain the trade-offs or show the observability signals for this request.`;

    return streamFromText(response, { delayMs: 8 });
  }
}
