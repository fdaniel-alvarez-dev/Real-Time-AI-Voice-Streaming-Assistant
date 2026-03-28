# Architecture

This document focuses on “how the pieces fit together” and why the seams are where they are.

## Goals

- Real-time streaming over **SSE and WebSockets**
- A practical “voice-agent style” loop (turn-taking + memory)
- Lightweight RAG grounding (understandable, runnable)
- Debuggability: every stage is instrumented and correlated

## Repo layout

```
/apps
  /api   Fastify API (SSE + WS + metrics)
  /web   Minimal Vite UI (WS/SSE demo)
/packages
  /core       config + safety + session store
  /rag        embeddings + vector search + KB loader
  /llm        streaming adapter interface + providers
  /telemetry  spans + metrics + structured logging helpers
/config
  runtime.example.json
/docs
```

## Runtime flow (one user turn)

1) Client sends `{ sessionId, text }` over HTTP/WS, or triggers SSE.
2) API enforces:
   - schema validation (Fastify)
   - rate limiting (`@fastify/rate-limit`)
   - safety refusal (`packages/core`)
3) Agent loop:
   - append user message to session memory
   - retrieve context from KB (RAG)
   - build a grounded prompt
   - stream tokens from the LLM adapter
   - append final assistant answer to memory
4) Observability:
   - requestId/sessionId/traceId in logs
   - retrieval + generation spans and histograms

## Transport notes

### SSE endpoint

- `GET /v1/sse/chat?sessionId=...&q=...`
- Emits events:
  - `token` → `{ token }`
  - `error` → `{ message }`
  - `done` → `{}`

SSE is a great default for “simple streaming”, especially behind corporate proxies.

### WebSocket endpoint

- `GET /v1/ws` upgrades to WS
- Client sends: `{ sessionId, text }`
- Server emits:
  - `{ type: "start" }`
  - `{ type: "token", token }` (many)
  - `{ type: "error", message }` (optional)
  - `{ type: "done" }`

WebSockets become the obvious fit once you need duplex control: interruptions, backchannel signals, tool calls, etc.

## Configuration boundaries

All “provider selection” is config-driven:

- `config/runtime.json` picks `llm.provider`
- `OPENAI_API_KEY` is read from an env var (name also specified in config)

The default config is deterministic and runs offline (`mock`).

