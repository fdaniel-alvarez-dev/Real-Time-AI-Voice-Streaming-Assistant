import type { FastifyInstance } from "fastify";
import type { Deps } from "../server/deps.js";
import type { TelemetryMetrics } from "@rta/telemetry";

export function registerHealthRoutes(app: FastifyInstance, deps: Deps, metrics: TelemetryMetrics) {
  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async () => ({
    ok: true,
    provider: deps.llm.provider,
    envName: app.runtime.envName
  }));
  app.get("/metrics", async (_req, reply) => {
    reply.header("content-type", metrics.registry.contentType);
    return await metrics.registry.metrics();
  });
}

