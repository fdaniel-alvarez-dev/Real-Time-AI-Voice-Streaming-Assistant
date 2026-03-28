export function* splitIntoPseudoTokens(text: string): Generator<string> {
  const parts = text.split(/(\s+)/);
  for (const p of parts) {
    if (p.length === 0) continue;
    yield p;
  }
}

export async function* streamFromText(
  text: string,
  opts?: { delayMs?: number; signal?: AbortSignal }
): AsyncGenerator<{ type: "token"; token: string } | { type: "done" }> {
  const delayMs = opts?.delayMs ?? 10;
  for (const tok of splitIntoPseudoTokens(text)) {
    if (opts?.signal?.aborted) break;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    yield { type: "token", token: tok };
  }
  yield { type: "done" };
}

