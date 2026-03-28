import type { FastifyInstance } from "fastify";
import type { TelemetryMetrics } from "@rta/telemetry";
import type { Deps } from "./deps.js";
import { registerHealthRoutes } from "../routes/health.js";
import { registerSessionRoutes } from "../routes/sessions.js";
import { registerChatRoutes } from "../routes/chat.js";

export function registerRoutes(
  app: FastifyInstance,
  deps: Deps,
  metrics: TelemetryMetrics
): void {
  registerHealthRoutes(app, deps, metrics);
  registerSessionRoutes(app, deps);
  registerChatRoutes(app, deps, metrics);
}

