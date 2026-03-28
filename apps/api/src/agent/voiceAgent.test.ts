import { describe, expect, test } from "vitest";
import { createLogger, createMetrics } from "@rta/telemetry";
import { InMemorySessionStore } from "@rta/core";
import { KnowledgeBase, MockEmbeddings } from "@rta/rag";
import { MockLLMAdapter } from "@rta/llm";
import { streamAssistantReply } from "./voiceAgent.js";

describe("voice agent", () => {
  test("streams tokens and persists assistant message", async () => {
    const runtime = {
      envName: "test",
      http: { host: "127.0.0.1", port: 3001 },
      rateLimit: { max: 10_000, timeWindowMs: 60_000 },
      rag: { topK: 2, minScore: 0 },
      llm: {
        provider: "mock",
        openai: { baseUrl: "https://example.invalid", model: "gpt-test", apiKeyEnvVar: "OPENAI_API_KEY" }
      },
      safety: { refuseOn: [] }
    } as any;

    const sessions = new InMemorySessionStore();
    const session = sessions.create({ userAgent: "vitest" });
    const kb = new KnowledgeBase(new MockEmbeddings());
    await kb.loadFromJsonFile(new URL("../../../../packages/rag/data/knowledge.json", import.meta.url).pathname);

    const deps = { sessions, kb, llm: new MockLLMAdapter() } as any;
    const metrics = createMetrics();
    const logger = createLogger();

    const stream = streamAssistantReply({
      runtime,
      deps,
      metrics,
      logger,
      sessionId: session.sessionId,
      text: "Hello"
    });

    let gotTokens = 0;
    while (true) {
      const next = await stream.next();
      if (next.done) break;
      if (next.value.type === "token") gotTokens++;
    }

    expect(gotTokens).toBeGreaterThan(5);
    const history = sessions.snapshot(session.sessionId, { maxMessages: 100 });
    expect(history.some((m) => m.role === "assistant")).toBe(true);
  });
});

