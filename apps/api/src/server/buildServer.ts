import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { createMetrics, newRequestId } from "@rta/telemetry";
import { loadRuntimeConfig, type RuntimeConfig } from "@rta/core";
import { buildDeps } from "./deps.js";
import { registerRoutes } from "./routes.js";
import { registerErrorHandling, registerObservabilityHooks } from "./runtime.js";

type ServerConfig = {
  host: string;
  port: number;
};

declare module "fastify" {
  interface FastifyInstance {
    config: ServerConfig;
    runtime: RuntimeConfig;
  }
}

export async function buildServer(opts?: { runtime?: RuntimeConfig }) {
  const runtime = opts?.runtime ?? (await loadRuntimeConfig());
  const metrics = createMetrics();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      base: null,
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie"],
        remove: true
      }
    },
    genReqId: () => newRequestId(),
    disableRequestLogging: true
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.decorate("config", { host: runtime.http.host, port: runtime.http.port });
  app.decorate("runtime", runtime);

  await app.register(cors, { origin: true, credentials: false });
  await app.register(rateLimit, {
    max: runtime.rateLimit.max,
    timeWindow: runtime.rateLimit.timeWindowMs,
    errorResponseBuilder: () => ({ error: { code: "RATE_LIMITED", message: "Too many requests." } })
  });
  await app.register(websocket);

  registerObservabilityHooks(app, metrics);
  registerErrorHandling(app);

  const deps = await buildDeps({ runtime, logger: app.log, metrics });
  registerRoutes(app, deps, metrics);

  return app;
}
