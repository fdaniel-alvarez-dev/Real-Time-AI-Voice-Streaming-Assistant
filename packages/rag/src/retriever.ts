import { inSpan } from "@rta/telemetry";
import type { KnowledgeBase, KnowledgeHit } from "./knowledge.js";

export async function retrieveContext(
  kb: KnowledgeBase,
  query: string,
  opts: { topK: number; minScore: number }
): Promise<KnowledgeHit[]> {
  return await inSpan("rag.retrieve", async () => await kb.query(query, opts), {
    topK: opts.topK,
    minScore: opts.minScore
  });
}

