const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const transportEl = document.querySelector<HTMLSelectElement>("#transport")!;
const newSessionBtn = document.querySelector<HTMLButtonElement>("#newSession")!;
const sessionIdEl = document.querySelector<HTMLInputElement>("#sessionId")!;
const inputEl = document.querySelector<HTMLTextAreaElement>("#input")!;
const sendBtn = document.querySelector<HTMLButtonElement>("#send")!;
const outputEl = document.querySelector<HTMLPreElement>("#output")!;

function setStatus(ok: boolean, text: string) {
  statusEl.textContent = text;
  statusEl.className = ok ? "muted ok" : "muted bad";
}

function resetOutput() {
  outputEl.textContent = "";
}

function append(text: string) {
  outputEl.textContent += text;
}

async function healthCheck() {
  try {
    const res = await fetch("/readyz");
    const json = await res.json();
    setStatus(true, `api: ok · provider=${json.provider} · env=${json.envName}`);
  } catch (e) {
    setStatus(false, "api: not reachable (start the api on :3001)");
  }
}

newSessionBtn.addEventListener("click", async () => {
  const res = await fetch("/v1/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userAgent: navigator.userAgent })
  });
  const json = await res.json();
  sessionIdEl.value = json.sessionId;
});

sendBtn.addEventListener("click", async () => {
  resetOutput();

  const sessionId = sessionIdEl.value.trim();
  const text = inputEl.value.trim();
  const transport = transportEl.value;
  if (!sessionId) {
    append("Missing sessionId. Click “New session”.\n");
    return;
  }
  if (!text) {
    append("Missing input text.\n");
    return;
  }

  if (transport === "sse") {
    const url = new URL("/v1/sse/chat", window.location.origin);
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("q", text);

    const es = new EventSource(url.toString());
    es.addEventListener("token", (ev) => {
      const { token } = JSON.parse((ev as MessageEvent).data);
      append(token);
    });
    es.addEventListener("error", (ev) => {
      append("\n\n[SSE error]\n");
      es.close();
    });
    es.addEventListener("done", () => es.close());
    return;
  }

  const wsUrl =
    window.location.protocol === "https:"
      ? `wss://${window.location.host}/v1/ws`
      : `ws://${window.location.host}/v1/ws`;
  const socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ sessionId, text }));
  });
  socket.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.type === "token") append(msg.token);
    if (msg.type === "error") append(`\n\n[error] ${msg.message}\n`);
    if (msg.type === "done") socket.close();
  });
  socket.addEventListener("error", () => append("\n\n[WebSocket error]\n"));
});

healthCheck();

