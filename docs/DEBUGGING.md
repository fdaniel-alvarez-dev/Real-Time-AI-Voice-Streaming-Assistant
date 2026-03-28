# Debugging & Observability

The fastest way to debug real-time AI systems is to correlate “what the user experienced” with “what the system did”.

This repo intentionally makes that easy.

## Correlation IDs

You should see these fields in logs:

- `reqId` / `requestId`: request-level correlation (HTTP and WS upgrade request)
- `sessionId`: conversation scope
- `traceId`: spans across retrieval + generation stages
- `span`: named timing points

## Where time goes

Typical bottlenecks:

- embedding/query time (RAG)
- LLM time-to-first-token
- total generation time
- client disconnects/reconnects (especially with mobile)

This repo exposes:

- span duration logs for retrieval + generation start
- Prometheus histograms for retrieval and generation

## Metrics

`GET /metrics` provides:

- `rta_http_requests_total{route,method,status}`
- `rta_rag_retrieval_duration_ms_bucket{stage}`
- `rta_llm_generation_duration_ms_bucket{provider,stage}`
- `rta_llm_tokens_total{provider}`
- `rta_ws_connections_total`
- `rta_sse_streams_total`

## Common failure patterns

- **Config errors:** missing `config/runtime.json` → fix via `npm run setup:local`
- **Provider mismatch:** config says `openai` but key missing → automatic fallback to `mock` (warn log)
- **Safety refusal:** consistent `SAFETY_REFUSAL` error response (400)
- **SSE header-sent errors:** avoid throwing after sending headers; SSE route writes `error` events instead

