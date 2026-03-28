import { readFile } from "node:fs/promises";
import { cosineSimilarity, normalize } from "./vector.js";
import { inSpan } from "@rta/telemetry";

export type KnowledgeDoc = {
  id: string;
  title: string;
  tags: string[];
  content: string;
};

export type KnowledgeHit = {
  doc: KnowledgeDoc;
  score: number;
};

export type Embedder = {
  embed(texts: string[]): Promise<number[][]>;
};

export class KnowledgeBase {
  private docs: KnowledgeDoc[] = [];
  private vectors: number[][] = [];

  constructor(private readonly embedder: Embedder) {}

  async loadFromJsonFile(path: string): Promise<void> {
    const raw = JSON.parse(await readFile(path, "utf8")) as KnowledgeDoc[];
    this.docs = raw;
    const embeddings = await inSpan("rag.embed.docs", async () => {
      return await this.embedder.embed(raw.map((d) => `${d.title}\n\n${d.content}`));
    });
    this.vectors = embeddings.map(normalize);
  }

  async query(text: string, opts: { topK: number; minScore: number }): Promise<KnowledgeHit[]> {
    const [q] = await inSpan("rag.embed.query", async () => await this.embedder.embed([text]));
    const qn = normalize(q ?? []);

    const scored: KnowledgeHit[] = [];
    for (let i = 0; i < this.docs.length; i++) {
      const doc = this.docs[i]!;
      const vec = this.vectors[i]!;
      const score = cosineSimilarity(qn, vec);
      scored.push({ doc, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.filter((h) => h.score >= opts.minScore).slice(0, opts.topK);
  }
}

