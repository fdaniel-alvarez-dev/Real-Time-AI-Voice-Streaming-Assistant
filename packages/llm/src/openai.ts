import { inSpan } from "@rta/telemetry";
import type { LLMAdapter, LLMGenerateInput, LLMStream, StreamChunk } from "./types.js";
import { streamFromText } from "./tokens.js";

export type OpenAIChatOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  stream?: boolean;
};

function toOpenAIMessages(messages: LLMGenerateInput["messages"]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

async function* parseOpenAIChatCompletionsSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<StreamChunk> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = chunk.split("\n").map((l) => l.trim());
      const dataLines = lines.filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
      for (const data of dataLines) {
        if (data === "[DONE]") {
          yield { type: "done" };
          return;
        }
        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = json.choices?.[0]?.delta?.content;
          if (token) yield { type: "token", token };
        } catch {
          // Ignore malformed SSE frames; the caller will still get a usable stream or fallback.
        }
      }
    }
  }

  yield { type: "done" };
}

export class OpenAIChatAdapter implements LLMAdapter {
  public readonly provider = "openai";

  constructor(private readonly opts: OpenAIChatOptions) {}

  streamChat(input: LLMGenerateInput): LLMStream {
    return (async function* (self: OpenAIChatAdapter): LLMStream {
      const base = self.opts.baseUrl.endsWith("/") ? self.opts.baseUrl : `${self.opts.baseUrl}/`;
      const url = new URL("chat/completions", base);
      const payload = {
        model: self.opts.model,
        messages: toOpenAIMessages(input.messages),
        temperature: input.temperature ?? 0.2,
        stream: self.opts.stream ?? true
      };

      const res = await inSpan("llm.openai.request", async () => {
        return await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${self.opts.apiKey}`
          },
          body: JSON.stringify(payload)
        });
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        yield { type: "error", message: `OpenAI error: ${res.status} ${body}` };
        yield { type: "done" };
        return;
      }

      if (payload.stream && res.body) {
        yield* parseOpenAIChatCompletionsSSE(res.body);
        return;
      }

      // Non-streaming fallback, then simulate streaming (still useful for SSE demos).
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      const text = json.choices?.[0]?.message?.content ?? "";
      yield* streamFromText(text, { delayMs: 0 });
    })(this);
  }
}
