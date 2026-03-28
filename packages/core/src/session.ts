import { newSessionId } from "@rta/telemetry";
import { NotFoundError } from "./errors.js";

export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
  role: Role;
  content: string;
  at: number;
};

export type Session = {
  sessionId: string;
  createdAt: number;
  lastSeenAt: number;
  messages: ChatMessage[];
  meta: {
    userAgent?: string;
  };
};

export type CreateSessionInput = {
  userAgent?: string;
};

export class InMemorySessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly ttlMs: number;

  constructor(opts?: { ttlMs?: number }) {
    this.ttlMs = opts?.ttlMs ?? 1000 * 60 * 60; // 1h
  }

  create(input?: CreateSessionInput): Session {
    const now = Date.now();
    const session: Session = {
      sessionId: newSessionId(),
      createdAt: now,
      lastSeenAt: now,
      messages: [],
      meta: input?.userAgent ? { userAgent: input.userAgent } : {}
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string): Session {
    this.gc();
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundError(`Unknown sessionId: ${sessionId}`);
    session.lastSeenAt = Date.now();
    return session;
  }

  appendMessage(sessionId: string, role: Role, content: string): void {
    const session = this.get(sessionId);
    session.messages.push({ role, content, at: Date.now() });
  }

  snapshot(sessionId: string, opts?: { maxMessages?: number }): ChatMessage[] {
    const session = this.get(sessionId);
    const maxMessages = opts?.maxMessages ?? 16;
    return session.messages.slice(-maxMessages);
  }

  private gc(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastSeenAt > this.ttlMs) this.sessions.delete(sessionId);
    }
  }
}
