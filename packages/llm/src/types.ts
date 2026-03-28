export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type StreamChunk =
  | { type: "token"; token: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type LLMStream = AsyncIterable<StreamChunk>;

export type LLMGenerateInput = {
  messages: ChatMessage[];
  temperature?: number;
};

export type LLMAdapter = {
  provider: string;
  streamChat(input: LLMGenerateInput): LLMStream;
};

