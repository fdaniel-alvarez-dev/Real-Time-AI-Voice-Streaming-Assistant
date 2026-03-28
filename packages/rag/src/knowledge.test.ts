import { describe, expect, test } from "vitest";
import { KnowledgeBase } from "./knowledge.js";

describe("knowledge base", () => {
  test("returns higher score for closer vectors", async () => {
    const embedder = {
      async embed(texts: string[]) {
        return texts.map((t) => {
          if (t.includes("alpha")) return [1, 0];
          if (t.includes("beta")) return [0, 1];
          if (t.includes("query")) return [0.9, 0.1];
          return [0, 0];
        });
      }
    };

    const kb = new KnowledgeBase(embedder);
    await kb.loadFromJsonFile(
      new URL("../data/knowledge.json", import.meta.url).pathname
    );

    // Overwrite docs/vectors to keep the test deterministic (we’re testing scoring/sorting).
    (kb as any).docs = [
      { id: "a", title: "alpha", tags: [], content: "alpha" },
      { id: "b", title: "beta", tags: [], content: "beta" }
    ];
    (kb as any).vectors = [
      [1, 0],
      [0, 1]
    ];

    const hits = await kb.query("query", { topK: 2, minScore: 0 });
    expect(hits[0]?.doc.id).toBe("a");
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
  });
});

