/**
 * E2E smoke test against a running API instance.
 *
 * Requires:
 * - API running (see README)
 * - RTA_BASE_URL (optional) default http://127.0.0.1:3001
 *
 * This validates:
 * - session creation
 * - non-stream HTTP chat
 * - SSE streaming endpoint (token + done)
 * - WebSocket streaming endpoint (token + done)
 */

const baseUrl = process.env.RTA_BASE_URL ?? "http://127.0.0.1:3001";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function postJson(path, body) {
  const res = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function getText(path) {
  const res = await fetch(new URL(path, baseUrl));
  const text = await res.text();
  return { res, text };
}

async function run() {
  console.log(`[e2e] baseUrl=${baseUrl}`);

  const ready = await getText("/readyz");
  assert(ready.res.ok, `/readyz failed: ${ready.res.status} ${ready.text}`);
  console.log("[e2e] readyz ok");

  const s = await postJson("/v1/sessions", { userAgent: "e2eSmoke" });
  assert(s.res.ok, `/v1/sessions failed: ${s.res.status} ${JSON.stringify(s.json)}`);
  const sessionId = s.json.sessionId;
  assert(typeof sessionId === "string" && sessionId.length > 10, "sessionId missing");
  console.log("[e2e] session ok", sessionId);

  const chat = await postJson("/v1/chat", { sessionId, text: "Explain WS vs SSE in one sentence." });
  assert(chat.res.ok, `/v1/chat failed: ${chat.res.status} ${JSON.stringify(chat.json)}`);
  assert(typeof chat.json.answer === "string" && chat.json.answer.length > 10, "answer missing");
  console.log("[e2e] http chat ok");

  const sseUrl = new URL("/v1/sse/chat", baseUrl);
  sseUrl.searchParams.set("sessionId", sessionId);
  sseUrl.searchParams.set("q", "Say hello in a short streaming answer.");
  const sse = await fetch(sseUrl);
  assert(sse.ok, `/v1/sse/chat failed: ${sse.status}`);
  const sseBody = await sse.text();
  assert(sseBody.includes("event: token"), "SSE did not include token events");
  assert(sseBody.includes("event: done"), "SSE did not include done event");
  console.log("[e2e] sse ok");

  const wsUrl = baseUrl.replace(/^http/, "ws") + "/v1/ws";
  const ws = new WebSocket(wsUrl);

  const wsResult = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WS timeout")), 30_000);
    let gotToken = false;
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ sessionId, text: "Say 'ok' and stop." }));
    });
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.type === "token") gotToken = true;
      if (msg.type === "done") {
        clearTimeout(timeout);
        ws.close();
        resolve({ gotToken });
      }
      if (msg.type === "error") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`WS error: ${msg.message}`));
      }
    });
    ws.addEventListener("error", () => reject(new Error("WS socket error")));
  });

  assert(wsResult.gotToken, "WS did not stream tokens");
  console.log("[e2e] ws ok");

  console.log("[e2e] all good");
}

run().catch((e) => {
  console.error("[e2e] failed", e);
  process.exit(1);
});

