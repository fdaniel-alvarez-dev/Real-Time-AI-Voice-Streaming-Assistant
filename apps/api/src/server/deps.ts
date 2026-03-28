import type { RuntimeConfig } from "@rta/core";
import { InMemorySessionStore } from "@rta/core";
import { KnowledgeBase, MockEmbeddings } from "@rta/rag";
import { MockLLMAdapter, OpenAIChatAdapter, type LLMAdapter } from "@rta/llm";
import type { TelemetryMetrics } from "@rta/telemetry";
import { resolveKnowledgePath } from "./knowledgePath.js";

export type Deps = {
  sessions: InMemorySessionStore;
  kb: KnowledgeBase;
  llm: LLMAdapter;
};

type LoggerLike = {
  warn: (obj: any, msg?: string) => void;
};

function buildLLM(runtime: RuntimeConfig, logger: LoggerLike): LLMAdapter {
  if (runtime.llm.provider !== "openai") return new MockLLMAdapter();
  const apiKey = process.env[runtime.llm.openai.apiKeyEnvVar] ?? "";
  if (!apiKey) {
    logger.warn(
      { envVar: runtime.llm.openai.apiKeyEnvVar },
      "OpenAI selected but API key env var is empty; falling back to mock provider."
    );
    return new MockLLMAdapter();
  }
  return new OpenAIChatAdapter({
    baseUrl: runtime.llm.openai.baseUrl,
    apiKey,
    model: runtime.llm.openai.model,
    stream: true
  });
}

export async function buildDeps(opts: {
  runtime: RuntimeConfig;
  logger: LoggerLike;
  metrics: TelemetryMetrics;
}): Promise<Deps> {
  const sessions = new InMemorySessionStore();
  const llm = buildLLM(opts.runtime, opts.logger);

  const kb = new KnowledgeBase(new MockEmbeddings());
  await kb.loadFromJsonFile(resolveKnowledgePath());

  return { sessions, kb, llm };
}
