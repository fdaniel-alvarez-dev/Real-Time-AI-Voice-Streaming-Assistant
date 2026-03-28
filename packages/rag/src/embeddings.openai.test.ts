import { describe, expect, test } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { OpenAIEmbeddings } from "./embeddings.js";

describe("OpenAIEmbeddings", () => {
  test("calls /v1/embeddings and returns vectors", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    const baseUrl = "https://api.mock.local/v1";
    const pool = agent.get("https://api.mock.local");
    pool.intercept({ method: "POST", path: "/v1/embeddings" }).reply(200, {
      data: [{ embedding: [1, 2, 3] }, { embedding: [4, 5, 6] }]
    });

    const emb = new OpenAIEmbeddings({ baseUrl, apiKey: "test-key", model: "text-embedding-test" });
    const out = await emb.embed(["a", "b"]);
    expect(out).toEqual([
      [1, 2, 3],
      [4, 5, 6]
    ]);
  });
});

