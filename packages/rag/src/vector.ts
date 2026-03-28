export function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i]! * b[i]!;
  return sum;
}

export function l2norm(a: number[]): number {
  let sum = 0;
  for (const x of a) sum += x * x;
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const denom = l2norm(a) * l2norm(b);
  if (denom === 0) return 0;
  return dot(a, b) / denom;
}

export function normalize(a: number[]): number[] {
  const n = l2norm(a);
  if (n === 0) return a.slice();
  return a.map((x) => x / n);
}

