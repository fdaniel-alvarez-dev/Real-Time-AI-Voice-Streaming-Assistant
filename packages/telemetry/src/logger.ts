import pino, { type LoggerOptions } from "pino";

export type LoggerLike = {
  child: (bindings: Record<string, unknown>) => LoggerLike;
  info: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
};

export type LogContext = {
  requestId?: string;
  sessionId?: string;
  traceId?: string;
  span?: string;
};

export function createLogger(options?: LoggerOptions): LoggerLike {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    base: null,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie"],
      remove: true
    },
    ...options
  }) as unknown as LoggerLike;
}

export function withLogContext(logger: LoggerLike, ctx: LogContext): LoggerLike {
  return logger.child(ctx);
}
