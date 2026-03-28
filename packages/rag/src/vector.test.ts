import { describe, expect, test } from "vitest";
import { cosineSimilarity, normalize } from "./vector.js";

describe("vector", () => {
  test("cosine similarity basics", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 8);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 8);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 8);
  });

  test("normalize produces unit-ish vector", () => {
    const n = normalize([3, 4]);
    expect(cosineSimilarity(n, n)).toBeCloseTo(1, 8);
  });
});

