import { createHash } from "node:crypto";

export type EmbeddingsAdapter = {
  embed(texts: string[]): Promise<number[][]>;
};

export type MockEmbeddingsOptions = {
  dims?: number;
};

export class MockEmbeddings implements EmbeddingsAdapter {
  private readonly dims: number;

  constructor(opts?: MockEmbeddingsOptions) {
    this.dims = opts?.dims ?? 256;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): number[] {
    const v = new Array<number>(this.dims).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    for (const tok of tokens) {
      const h = createHash("sha256").update(tok).digest();
      for (let i = 0; i < this.dims; i++) {
        const byte = h[i % h.length] ?? 0;
        v[i] = (v[i] ?? 0) + (byte - 128) / 128;
      }
    }

    // Small length feature so very short/long queries don't totally collide.
    v[0] = (v[0] ?? 0) + Math.tanh(tokens.length / 32);
    return v;
  }
}

export type OpenAIEmbeddingsOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export class OpenAIEmbeddings implements EmbeddingsAdapter {
  constructor(private readonly opts: OpenAIEmbeddingsOptions) {}

  async embed(texts: string[]): Promise<number[][]> {
    const base = this.opts.baseUrl.endsWith("/") ? this.opts.baseUrl : `${this.opts.baseUrl}/`;
    const url = new URL("embeddings", base);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.opts.apiKey}`
      },
      body: JSON.stringify({
        model: this.opts.model,
        input: texts
      })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings error: ${res.status} ${body}`);
    }

    const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((d) => d.embedding);
  }
}
