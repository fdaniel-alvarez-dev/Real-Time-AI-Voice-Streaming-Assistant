import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function resolveKnowledgePath(): string {
  const candidates = [
    resolve(process.cwd(), "packages/rag/data/knowledge.json"),
    resolve(process.cwd(), "dist/knowledge.json")
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // Last resort: relative to this file (works in dev within the monorepo).
  return new URL("../../../../packages/rag/data/knowledge.json", import.meta.url).pathname;
}

