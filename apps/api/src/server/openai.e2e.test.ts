import { describe, expect, test } from "vitest";
import { buildServer } from "./buildServer.js";

const shouldRun = process.env.RTA_E2E === "1";
const apiKey = process.env.OPENAI_API_KEY ?? "";

describe.skipIf(!shouldRun)("api e2e with OpenAI (inject)", () => {
  test(
    "POST /v1/chat streams from OpenAI under the hood",
    async () => {
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");

      const runtime = {
        envName: "e2e-openai",
        http: { host: "127.0.0.1", port: 3001 },
        rateLimit: { max: 10_000, timeWindowMs: 60_000 },
        rag: { topK: 2, minScore: 0 },
        llm: {
          provider: "openai",
          openai: {
            baseUrl: "https://api.openai.com/v1",
            model: process.env.RTA_OPENAI_MODEL ?? "gpt-4o-mini",
            apiKeyEnvVar: "OPENAI_API_KEY"
          }
        },
        safety: { refuseOn: [] }
      } as any;

      const app = await buildServer({ runtime });

      const s = await app.inject({ method: "POST", url: "/v1/sessions", payload: {} });
      const { sessionId } = s.json() as { sessionId: string };
      expect(sessionId).toBeTruthy();

      const res = await app.inject({
        method: "POST",
        url: "/v1/chat",
        payload: { sessionId, text: "Say 'ok' and one sentence about SSE vs WS." }
      });
      expect(res.statusCode).toBe(200);
      const json = res.json() as any;
      expect(String(json.answer).toLowerCase()).toContain("ok");
    },
    60_000
  );
});

