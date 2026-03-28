export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly expose: boolean;
  public readonly details: Record<string, unknown> | undefined;

  constructor(opts: {
    code: string;
    message: string;
    statusCode: number;
    expose?: boolean;
    details?: Record<string, unknown> | undefined;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.expose = opts.expose ?? false;
    this.details = opts.details;
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "CONFIG_ERROR", message, statusCode: 500, expose: true, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super({ code: "NOT_FOUND", message, statusCode: 404, expose: true });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super({ code: "RATE_LIMITED", message, statusCode: 429, expose: true });
  }
}

export class SafetyRefusalError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "SAFETY_REFUSAL", message, statusCode: 400, expose: true, details });
  }
}
