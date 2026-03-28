# Real-Time AI Voice & Streaming Assistant (Node.js + TypeScript)

This repo is a production-minded reference implementation for **real-time AI experiences**:

- **WebSockets** for true duplex, session-oriented conversations (voice-agent style “barge-in”, backchannel, tool calls)
- **SSE (Server-Sent Events)** for simple, enterprise-friendly server→client token streaming over HTTP
- **Lightweight RAG** (in-memory vectors) to ground answers without a database dependency
- **Observability first**: structured logs, request/session correlation, and Prometheus metrics around retrieval + generation + streaming

It’s intentionally not “feature rich”. It’s built to be **architecturally clear, runnable, and interview-defensible**.

## H-F-V-P (How this repo was built)

This codebase follows a practical engineering loop for real-time AI systems:

- **F — Framing:** prioritize streaming, debuggability, and transport trade-offs over “AI bells & whistles”
- **H — High-fidelity:** real code paths for WS/SSE + RAG + guardrails + telemetry (not placeholder folders)
- **P — Process:** modular packages, config-driven adapters, deterministic mock mode
- **V — Validation:** unit + integration-style tests; external providers are mockable by configuration

## What this demonstrates (for Lead AI Engineer / Technical CEO reviewers)

- Streaming systems design (token streaming, long-lived connections, disconnect handling)
- When to choose **WebSockets vs SSE** (and how to explain it in an enterprise setting)
- Voice-agent workflow (session memory + conversational continuity; practical guardrails)
- Lightweight RAG (vector search, explainable scoring, controllable thresholds)
- Observability you can actually use in production incidents

## Architecture (high level)

```
Browser UI (apps/web) ───────────────────────────────┐
  - WS chat (duplex)                                 │
  - SSE chat (server→client stream)                  │
                                                     │
                         HTTP / WS                   │
apps/api (Fastify)  ─────────────────────────────────┤
  /v1/chat  (HTTP, non-stream)                       │
  /v1/sse/chat (SSE, token stream)                   │
  /v1/ws   (WebSocket, token stream)                 │
  /metrics (Prometheus)                              │
                                                     │
  Voice Agent Orchestrator                           │
   ├─ safety/validation + rate limiting              │
   ├─ session memory (in-memory store)               │
   ├─ RAG retrieval (in-memory vectors)              │
   └─ LLM adapter (mock or OpenAI) → token stream    │

packages/
  core        config + session + safety errors
  rag         embeddings + vector search + KB loader
  llm         streaming adapter interface + providers
  telemetry   structured logs + spans + metrics
```

## Why Fastify (vs Express)

This repo uses **Fastify** because it gives you a “senior-friendly” baseline for real-time systems:

- Strong plugin model (WebSockets, rate limiting, CORS) without custom wiring
- Built-in JSON schema validation (lower risk at the edges)
- Great throughput with low overhead (streaming + long-lived connections are common)
- Pino logging by default (structured logs, low cost)

Express is still a valid choice. For this repository’s goals (streaming + schema + perf + observability), Fastify is the cleaner fit.

## WebSockets vs SSE: decision framework

Use **SSE** when:

- you only need **server → client** streaming (tokens, events, progress)
- you want simple HTTP semantics, easy proxies/load balancers, and fewer moving parts
- you want “enterprise-default” networking (fewer WS edge cases)

Use **WebSockets** when:

- you need true **bi-directional** messaging (interruptions, barge-in, tool calls, client signals)
- you want a single long-lived session transport for an “agent loop”
- you need lower latency for back-and-forth interaction

In voice agents, you typically start with WebSockets as soon as you want:
“user starts talking” → “assistant starts responding” → “user interrupts” → “assistant stops” → “new turn”.

## Getting started (local)

### 1) Install deps

```bash
npm install
```

### 2) Create runtime config

```bash
npm run setup:local
```

This creates `config/runtime.json` from `config/runtime.example.json` (the file is gitignored on purpose).

### 3) Run dev

```bash
npm run dev
```

- Web UI: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001`

### Useful endpoints

```bash
curl -sS http://127.0.0.1:3001/readyz
curl -sS http://127.0.0.1:3001/metrics | head
```

## Configuration: mock vs end-to-end

Mode is controlled by the config file, not hidden flags:

- Mock mode: `config/runtime.json` → `"llm": { "provider": "mock" }`
- End-to-end mode (OpenAI): set `"provider": "openai"` and export your key:

```bash
export OPENAI_API_KEY="..."
```

An example is in `config/runtime.openai.example.json`.

## Observability strategy (what to look at in an incident)

- **Correlation:** `requestId` + `sessionId` + `traceId` show up in logs
- **Spans (duration logs):** retrieval + embedding + generation start are timed
- **Metrics:** `GET /metrics` exposes:
  - request counts
  - RAG retrieval histograms
  - LLM generation histograms
  - token counters
  - WS/SSE connection counters

## Trade-offs and known limitations

- **RAG is intentionally small:** in-memory vectors + deterministic embeddings by default; easy to replace with SQLite/pgvector later.
- **SSE demo uses query params** (`GET /v1/sse/chat?sessionId=...&q=...`) for `EventSource` simplicity. Production typically uses a POST+streaming fetch, or sends only an event ID and pulls the message from storage.
- **No STT/TTS included:** the repo focuses on the real-time “agent loop” and observability boundaries; speech I/O should be plugged in as adapters.
- **Sessions are in-memory:** great for clarity and local demos; production should use Redis or a DB.

## Failure modes (intentionally handled)

- Missing `config/runtime.json` → explicit startup error with instructions
- Provider set to OpenAI but key missing → logs a warning and falls back to mock
- Rate limiting → consistent 429 response
- Safety refusal → consistent 400 response with a refusal code
- Client disconnects during SSE → aborts the stream cleanly

## Docs

- `docs/ARCHITECTURE.md`
- `docs/TRADEOFFS.md`
- `docs/DEBUGGING.md`

## Next steps (production-minded)

- Add auth + per-tenant rate limits and quotas
- Move sessions + traces to Redis (or a DB) for horizontal scaling
- Upgrade RAG to SQLite/pgvector + background indexing
- Add OpenTelemetry export (Tempo/Jaeger) and log shipping (Loki/ELK)
- Add “barge-in” semantics for WS (cancel generation on user interruption)

