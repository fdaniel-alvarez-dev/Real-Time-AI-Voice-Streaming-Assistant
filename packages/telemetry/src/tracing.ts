import { AsyncLocalStorage } from "node:async_hooks";
import { newTraceId } from "./ids.js";
import type { LoggerLike } from "./logger.js";

export type TraceContext = {
  traceId: string;
  logger: LoggerLike;
};

const storage = new AsyncLocalStorage<TraceContext>();

export function getTraceContext(): TraceContext | undefined {
  return storage.getStore();
}

export async function withTrace<T>(
  logger: LoggerLike,
  fn: () => Promise<T>,
  traceId: string = newTraceId()
): Promise<T> {
  return await storage.run({ traceId, logger: logger.child({ traceId }) }, fn);
}

export async function inSpan<T>(
  name: string,
  fn: () => Promise<T>,
  extra?: Record<string, unknown>
): Promise<T> {
  const ctx = getTraceContext();
  const spanLogger: LoggerLike | undefined = ctx?.logger
    ? ctx.logger.child({ span: name, ...(extra ?? {}) })
    : undefined;

  const start = performance.now();
  try {
    const result = await fn();
    const ms = Math.round((performance.now() - start) * 100) / 100;
    spanLogger?.info({ durationMs: ms }, "span.ok");
    return result;
  } catch (error) {
    const ms = Math.round((performance.now() - start) * 100) / 100;
    spanLogger?.error({ durationMs: ms, error }, "span.error");
    throw error;
  }
}
