import type { RuntimeConfig } from "@rta/core";
import { enforceSafety } from "@rta/core";
import type { TelemetryMetrics } from "@rta/telemetry";
import { inSpan } from "@rta/telemetry";
import type { KnowledgeHit } from "@rta/rag";
import { retrieveContext } from "@rta/rag";
import type { ChatMessage, StreamChunk } from "@rta/llm";
import type { Deps } from "../server/deps.js";

export type AgentResult = {
  hits: KnowledgeHit[];
  answer: string;
};

export type LoggerLike = {
  warn: (obj: any, msg?: string) => void;
};

function buildPrompt(opts: { history: ChatMessage[]; hits: KnowledgeHit[] }): ChatMessage[] {
  const contextBlock = opts.hits
    .map((h) => `- ${h.doc.title} (score=${h.score.toFixed(3)})\n  ${h.doc.content}`)
    .join("\n");

  return [
    {
      role: "system",
      content:
        "You are a real-time voice assistant. Be concise, pragmatic, and explain trade-offs. " +
        "If retrieved context is relevant, cite it by title. " +
        "Never claim you executed actions you didn't execute."
    },
    ...opts.history,
    { role: "system", content: `Retrieved context:\n${contextBlock || "(none)"}` }
  ];
}

export async function* streamAssistantReply(opts: {
  runtime: RuntimeConfig;
  deps: Deps;
  metrics: TelemetryMetrics;
  logger: LoggerLike;
  sessionId: string;
  text: string;
}): AsyncGenerator<StreamChunk, AgentResult, void> {
  const { runtime, deps, metrics, logger, sessionId, text } = opts;
  enforceSafety(text, runtime.safety);

  deps.sessions.appendMessage(sessionId, "user", text);
  const history = deps.sessions
    .snapshot(sessionId)
    .map((m) => ({ role: m.role, content: m.content })) satisfies ChatMessage[];

  const hits = await inSpan("agent.retrieve", async () => {
    const t0 = performance.now();
    const got = await retrieveContext(deps.kb, text, runtime.rag);
    metrics.ragRetrievalDurationMs.observe({ stage: "query" }, performance.now() - t0);
    return got;
  });

  const prompt = buildPrompt({ history, hits });

  let answer = "";
  const genStart = performance.now();

  const stream = await inSpan("agent.generate.start", async () => deps.llm.streamChat({ messages: prompt }), {
    provider: deps.llm.provider
  });

  for await (const chunk of stream) {
    if (chunk.type === "token") {
      answer += chunk.token;
      metrics.llmTokensTotal.inc({ provider: deps.llm.provider });
      yield chunk;
    } else if (chunk.type === "error") {
      logger.warn({ provider: deps.llm.provider, message: chunk.message }, "llm.stream.error");
      yield chunk;
    }
  }

  metrics.llmGenerationDurationMs.observe(
    { provider: deps.llm.provider, stage: "stream" },
    performance.now() - genStart
  );

  deps.sessions.appendMessage(sessionId, "assistant", answer);
  return { hits, answer };
}
