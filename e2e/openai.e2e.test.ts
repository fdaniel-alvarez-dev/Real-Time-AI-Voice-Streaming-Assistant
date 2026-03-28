import { describe, expect, test } from "vitest";
import { OpenAIChatAdapter } from "../packages/llm/src/openai.js";
import { OpenAIEmbeddings } from "../packages/rag/src/embeddings.js";

const shouldRun = process.env.RTA_E2E === "1";
const apiKey = process.env.OPENAI_API_KEY ?? "";

describe.skipIf(!shouldRun)("openai e2e (live)", () => {
  test(
    "embeddings endpoint returns vectors",
    async () => {
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
      const emb = new OpenAIEmbeddings({
        baseUrl: "https://api.openai.com/v1",
        apiKey,
        model: "text-embedding-3-small"
      });
      const out = await emb.embed(["hello", "world"]);
      expect(out.length).toBe(2);
      expect(out[0]!.length).toBeGreaterThan(100);
    },
    60_000
  );

  test(
    "chat streaming produces tokens",
    async () => {
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
      const llm = new OpenAIChatAdapter({
        baseUrl: "https://api.openai.com/v1",
        apiKey,
        model: process.env.RTA_OPENAI_MODEL ?? "gpt-4o-mini",
        stream: true
      });

      let text = "";
      for await (const chunk of llm.streamChat({
        messages: [{ role: "user", content: "Say 'ok' and one short sentence about SSE." }],
        temperature: 0
      })) {
        if (chunk.type === "token") text += chunk.token;
      }
      expect(text.toLowerCase()).toContain("ok");
      expect(text.length).toBeGreaterThan(10);
    },
    60_000
  );
});

