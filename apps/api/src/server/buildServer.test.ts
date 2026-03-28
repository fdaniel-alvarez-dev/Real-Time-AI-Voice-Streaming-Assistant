import { describe, expect, test } from "vitest";
import { buildServer } from "./buildServer.js";

const runtime = {
  envName: "test",
  http: { host: "127.0.0.1", port: 3001 },
  rateLimit: { max: 10_000, timeWindowMs: 60_000 },
  rag: { topK: 3, minScore: 0 },
  llm: {
    provider: "mock",
    openai: { baseUrl: "https://example.invalid", model: "gpt-test", apiKeyEnvVar: "OPENAI_API_KEY" }
  },
  safety: { refuseOn: ["self_harm", "illegal_activity", "pii_exfiltration"] }
} as const;

describe("api server (inject)", () => {
  test("health routes", async () => {
    const app = await buildServer({ runtime: runtime as any });
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, provider: "mock", envName: "test" });
  });

  test("session + chat", async () => {
    const app = await buildServer({ runtime: runtime as any });

    const s = await app.inject({
      method: "POST",
      url: "/v1/sessions",
      payload: { userAgent: "vitest" }
    });
    expect(s.statusCode).toBe(200);
    const { sessionId } = s.json() as { sessionId: string };
    expect(sessionId).toBeTruthy();

    const chat = await app.inject({
      method: "POST",
      url: "/v1/chat",
      payload: { sessionId, text: "Explain WebSockets vs SSE for streaming tokens." }
    });
    expect(chat.statusCode).toBe(200);
    const json = chat.json() as any;
    expect(json.sessionId).toBe(sessionId);
    expect(String(json.answer)).toContain("SSE");
  });

  test("sse stream returns token events", async () => {
    const app = await buildServer({ runtime: runtime as any });
    const s = await app.inject({ method: "POST", url: "/v1/sessions", payload: {} });
    const { sessionId } = s.json() as { sessionId: string };

    const res = await app.inject({
      method: "GET",
      url: `/v1/sse/chat?sessionId=${encodeURIComponent(sessionId)}&q=${encodeURIComponent(
        "Say hi."
      )}`
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.payload).toContain("event: token");
    expect(res.payload).toContain("event: done");
  });

  test("safety refusal returns 400", async () => {
    const app = await buildServer({ runtime: runtime as any });
    const s = await app.inject({ method: "POST", url: "/v1/sessions", payload: {} });
    const { sessionId } = s.json() as { sessionId: string };

    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      payload: { sessionId, text: "I want to kill myself." }
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: "SAFETY_REFUSAL" } });
  });
});
