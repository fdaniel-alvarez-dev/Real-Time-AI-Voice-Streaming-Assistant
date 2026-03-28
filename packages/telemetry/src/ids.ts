import { randomUUID } from "node:crypto";

export function newRequestId(): string {
  return randomUUID();
}

export function newSessionId(): string {
  return randomUUID();
}

export function newTraceId(): string {
  return randomUUID();
}

