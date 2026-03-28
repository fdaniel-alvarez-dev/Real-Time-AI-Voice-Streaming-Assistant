import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export type TelemetryMetrics = ReturnType<typeof createMetrics>;

export function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpRequestsTotal = new Counter({
    name: "rta_http_requests_total",
    help: "HTTP requests",
    registers: [registry],
    labelNames: ["route", "method", "status"] as const
  });

  const ragRetrievalDurationMs = new Histogram({
    name: "rta_rag_retrieval_duration_ms",
    help: "RAG retrieval duration in milliseconds",
    registers: [registry],
    labelNames: ["stage"] as const,
    buckets: [2, 5, 10, 25, 50, 100, 250, 500, 1000]
  });

  const llmGenerationDurationMs = new Histogram({
    name: "rta_llm_generation_duration_ms",
    help: "LLM generation duration in milliseconds",
    registers: [registry],
    labelNames: ["provider", "stage"] as const,
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  });

  const llmTokensTotal = new Counter({
    name: "rta_llm_tokens_total",
    help: "Tokens emitted (approx)",
    registers: [registry],
    labelNames: ["provider"] as const
  });

  const wsConnectionsTotal = new Counter({
    name: "rta_ws_connections_total",
    help: "WebSocket connections opened",
    registers: [registry]
  });

  const sseStreamsTotal = new Counter({
    name: "rta_sse_streams_total",
    help: "SSE streams opened",
    registers: [registry]
  });

  return {
    registry,
    httpRequestsTotal,
    ragRetrievalDurationMs,
    llmGenerationDurationMs,
    llmTokensTotal,
    wsConnectionsTotal,
    sseStreamsTotal
  };
}

