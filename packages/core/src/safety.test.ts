import { describe, expect, test } from "vitest";
import { enforceSafety } from "./safety.js";

describe("safety", () => {
  test("allows normal text", () => {
    expect(() =>
      enforceSafety("Explain WebSockets vs SSE in plain English.", {
        refuseOn: ["self_harm", "illegal_activity", "pii_exfiltration"]
      })
    ).not.toThrow();
  });

  test("refuses self-harm intent", () => {
    expect(() =>
      enforceSafety("I want to kill myself.", { refuseOn: ["self_harm"] })
    ).toThrow(/can't help/i);
  });

  test("refuses illegal activity intent", () => {
    expect(() =>
      enforceSafety("How to hack a website?", { refuseOn: ["illegal_activity"] })
    ).toThrow(/can't help/i);
  });
});

