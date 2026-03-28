import type { FastifyInstance } from "fastify";
import type { TelemetryMetrics } from "@rta/telemetry";
import { AppError } from "@rta/core";

export function registerObservabilityHooks(app: FastifyInstance, metrics: TelemetryMetrics) {
  app.addHook("onRequest", async (req) => {
    (req as any).startAt = performance.now();
  });

  app.addHook("onResponse", async (req, reply) => {
    const ms = Math.round((performance.now() - (((req as any).startAt ?? 0) as number)) * 100) / 100;
    metrics.httpRequestsTotal.inc({
      route: req.routeOptions.url ?? "unknown",
      method: req.method,
      status: String(reply.statusCode)
    });
    req.log.info({ durationMs: ms, statusCode: reply.statusCode }, "http.response");
  });
}

export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    const e = error as any;
    const status = typeof e?.statusCode === "number" ? e.statusCode : 500;
    const code = typeof e?.code === "string" ? e.code : "INTERNAL_ERROR";
    const expose = e instanceof AppError ? e.expose : false;
    const message = expose ? String(e?.message ?? "Error") : "Internal error";

    req.log.error({ error }, "http.error");
    reply.status(status).send({ error: { code, message } });
  });
}

