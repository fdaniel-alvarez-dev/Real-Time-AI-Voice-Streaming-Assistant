import { describe, expect, test } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { OpenAIChatAdapter } from "./openai.js";

describe("OpenAIChatAdapter", () => {
  test("streams tokens from SSE frames", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    const baseUrl = "https://api.mock.local/v1";
    const pool = agent.get("https://api.mock.local");
    pool
      .intercept({ method: "POST", path: "/v1/chat/completions" })
      .reply(
        200,
        [
          'data: {"choices":[{"delta":{"content":"Hello"}}]}',
          "",
          'data: {"choices":[{"delta":{"content":" world"}}]}',
          "",
          "data: [DONE]",
          "",
          ""
        ].join("\n"),
        { headers: { "content-type": "text/event-stream" } }
      );

    const llm = new OpenAIChatAdapter({
      baseUrl,
      apiKey: "test-key",
      model: "gpt-test",
      stream: true
    });

    let out = "";
    for await (const chunk of llm.streamChat({
      messages: [{ role: "user", content: "hi" }]
    })) {
      if (chunk.type === "token") out += chunk.token;
    }
    expect(out).toBe("Hello world");
  });
});

