import { SafetyRefusalError } from "./errors.js";

export type RefusalCategory = "self_harm" | "illegal_activity" | "pii_exfiltration";

export type SafetyConfig = {
  refuseOn: RefusalCategory[];
};

type SafetyFinding = { category: RefusalCategory; matched: string };

const patterns: Record<RefusalCategory, RegExp[]> = {
  self_harm: [
    /\bkill myself\b/i,
    /\bsuicide\b/i,
    /\bself[- ]harm\b/i,
    /\bend my life\b/i
  ],
  illegal_activity: [
    /\bmake a bomb\b/i,
    /\bhow to hack\b/i,
    /\bsteal\b/i,
    /\bcarding\b/i
  ],
  pii_exfiltration: [
    /\bsocial security number\b/i,
    /\bcredit card\b/i,
    /\bpassword\b/i,
    /\bapi key\b/i
  ]
};

export function evaluateSafety(text: string, cfg: SafetyConfig): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  for (const category of cfg.refuseOn) {
    for (const re of patterns[category] ?? []) {
      const m = text.match(re);
      if (m?.[0]) findings.push({ category, matched: m[0] });
    }
  }
  return findings;
}

export function enforceSafety(text: string, cfg: SafetyConfig): void {
  const findings = evaluateSafety(text, cfg);
  if (findings.length === 0) return;
  throw new SafetyRefusalError(
    "I can't help with that request. If you think this is a mistake, rephrase with a safe, high-level intent.",
    { findings }
  );
}

