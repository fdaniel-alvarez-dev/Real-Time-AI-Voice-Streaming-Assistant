# Trade-offs

This repo is deliberately opinionated. These are the “interview-ready” trade-offs.

## In-memory session store

**Why:** clarity and zero dependencies.

**Cost:** not horizontally scalable; memory resets on restart.

**Upgrade path:** Redis (fast, TTL), or Postgres (durable) depending on product needs.

## Lightweight RAG (in-memory vectors)

**Why:** runnable everywhere; easy to understand; no migrations.

**Cost:** no persistence, no large corpora.

**Upgrade path:** SQLite + embeddings table for solo deploys, or pgvector for multi-tenant.

## SSE demo uses query params

**Why:** `EventSource` is GET-only, and the UI is intentionally minimal.

**Cost:** not ideal for long inputs; URLs can leak to logs.

**Upgrade path:** POST + streamed `fetch()` response, or “message ID” over SSE + POST body stored server-side.

## Mock-first adapter design

**Why:** deterministic tests and developer experience; no external calls required.

**Cost:** mock behavior will diverge from real providers over time.

**Mitigation:** keep a small suite of “contract tests” against a local mock server; run true end-to-end in CI only when keys are available.

## Not implementing STT/TTS

**Why:** the “hard part” for many AI products is the real-time system around the model: transport, streaming, memory, telemetry, and guardrails.

**Upgrade path:** add `stt` and `tts` packages with the same adapter pattern as `llm`.

