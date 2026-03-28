import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ConfigError } from "./errors.js";

const Provider = Type.Union([Type.Literal("mock"), Type.Literal("openai")]);

export const RuntimeConfigSchema = Type.Object(
  {
    envName: Type.String({ minLength: 1 }),
    http: Type.Object({
      host: Type.String({ minLength: 1 }),
      port: Type.Integer({ minimum: 1, maximum: 65535 })
    }),
    rateLimit: Type.Object({
      max: Type.Integer({ minimum: 1 }),
      timeWindowMs: Type.Integer({ minimum: 1000 })
    }),
    rag: Type.Object({
      topK: Type.Integer({ minimum: 1, maximum: 20 }),
      minScore: Type.Number({ minimum: 0, maximum: 1 })
    }),
    llm: Type.Object({
      provider: Provider,
      openai: Type.Object({
        baseUrl: Type.String({ minLength: 1 }),
        model: Type.String({ minLength: 1 }),
        apiKeyEnvVar: Type.String({ minLength: 1 })
      })
    }),
    safety: Type.Object({
      refuseOn: Type.Array(
        Type.Union([
          Type.Literal("self_harm"),
          Type.Literal("illegal_activity"),
          Type.Literal("pii_exfiltration")
        ]),
        { minItems: 0 }
      )
    })
  },
  { additionalProperties: false }
);

export type RuntimeConfig = Static<typeof RuntimeConfigSchema>;

function findConfigUpwards(fromDir: string, relativePath: string, maxDepth = 8): string | undefined {
  let current = fromDir;
  for (let i = 0; i <= maxDepth; i++) {
    const candidate = resolve(current, relativePath);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const envPath = process.env.RTA_CONFIG_PATH;
  const configPath =
    envPath ??
    findConfigUpwards(process.cwd(), "config/runtime.json") ??
    // Final fallback: keep the previous behavior for clarity in error messages.
    "config/runtime.json";

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    throw new ConfigError(
      `Failed to read runtime config at ${configPath}. Copy config/runtime.example.json to config/runtime.json (or set RTA_CONFIG_PATH).`,
      {
        cause: String((error as Error)?.message ?? error),
        cwd: process.cwd(),
        hint: envPath
          ? "RTA_CONFIG_PATH was set but the file could not be read."
          : "No RTA_CONFIG_PATH set; expected to find config/runtime.json in the current directory or a parent directory."
      }
    );
  }

  if (!Value.Check(RuntimeConfigSchema, raw)) {
    const errors = [...Value.Errors(RuntimeConfigSchema, raw)].map((e) => ({
      path: e.path,
      message: e.message
    }));
    throw new ConfigError("Invalid runtime config.", { errors });
  }
  return raw;
}
