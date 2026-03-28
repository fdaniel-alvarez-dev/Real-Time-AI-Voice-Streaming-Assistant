import { readFile } from "node:fs/promises";
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

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const configPath = process.env.RTA_CONFIG_PATH ?? "config/runtime.json";
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    throw new ConfigError(
      `Failed to read runtime config at ${configPath}. Copy config/runtime.example.json to config/runtime.json.`,
      { cause: String((error as Error)?.message ?? error) }
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

