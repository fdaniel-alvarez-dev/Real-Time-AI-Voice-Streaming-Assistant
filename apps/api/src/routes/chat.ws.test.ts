import { describe, expect, test } from "vitest";
import { createMetrics } from "@rta/telemetry";
import { InMemorySessionStore } from "@rta/core";
import { KnowledgeBase, MockEmbeddings } from "@rta/rag";
import { MockLLMAdapter } from "@rta/llm";
import { handleWsChatMessage } from "./chat.js";

function makeLogger() {
  const logger: any = {
    child: () => logger,
    info() {},
    warn() {},
    error() {}
  };
  return logger;
}

describe("ws chat route handler (no socket)", () => {
  test("rejects invalid json", async () => {
    const sent: any[] = [];
    await handleWsChatMessage({
      send: (d) => sent.push(JSON.parse(d)),
      reqId: "r1",
      log: makeLogger(),
      app: { runtime: { rag: { topK: 1, minScore: 0 }, safety: { refuseOn: [] } } } as any,
      deps: {} as any,
      metrics: createMetrics(),
      rawMessage: Buffer.from("{nope", "utf8")
    });
    expect(sent[0]).toMatchObject({ type: "error" });
  });

  test("streams tokens and ends", async () => {
    const sessions = new InMemorySessionStore();
    const session = sessions.create();
    const kb = new KnowledgeBase(new MockEmbeddings());
    await kb.loadFromJsonFile(new URL("../../../../packages/rag/data/knowledge.json", import.meta.url).pathname);

    const deps = { sessions, kb, llm: new MockLLMAdapter() } as any;
    const metrics = createMetrics();
    const sent: any[] = [];

    await handleWsChatMessage({
      send: (d) => sent.push(JSON.parse(d)),
      reqId: "r1",
      log: makeLogger(),
      app: { runtime: { rag: { topK: 2, minScore: 0 }, safety: { refuseOn: [] } } } as any,
      deps,
      metrics,
      rawMessage: Buffer.from(JSON.stringify({ sessionId: session.sessionId, text: "Hello" }), "utf8")
    });

    expect(sent[0]).toMatchObject({ type: "start" });
    expect(sent.some((m) => m.type === "token")).toBe(true);
    expect(sent[sent.length - 1]).toMatchObject({ type: "done" });
  });
});
