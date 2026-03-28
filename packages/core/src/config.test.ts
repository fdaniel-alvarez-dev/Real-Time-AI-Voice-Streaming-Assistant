import { writeFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { loadRuntimeConfig } from "./config.js";

describe("config", () => {
  test("rejects invalid config", async () => {
    const path = "/tmp/rta-config-invalid.json";
    await writeFile(path, JSON.stringify({ nope: true }), "utf8");

    const prev = process.env.RTA_CONFIG_PATH;
    process.env.RTA_CONFIG_PATH = path;
    try {
      await expect(loadRuntimeConfig()).rejects.toThrow(/Invalid runtime config/i);
    } finally {
      process.env.RTA_CONFIG_PATH = prev;
    }
  });
});

