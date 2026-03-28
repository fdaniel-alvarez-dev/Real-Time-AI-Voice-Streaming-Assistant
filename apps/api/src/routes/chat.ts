import type { FastifyInstance } from "fastify";
import type { TelemetryMetrics } from "@rta/telemetry";
import { withLogContext, withTrace } from "@rta/telemetry";
import { Type } from "@sinclair/typebox";
import type { Deps } from "../server/deps.js";
import { streamAssistantReply } from "../agent/voiceAgent.js";

export function registerChatRoutes(app: FastifyInstance, deps: Deps, metrics: TelemetryMetrics) {
  app.post(
    "/v1/chat",
    {
      schema: {
        body: Type.Object({
          sessionId: Type.String({ minLength: 1 }),
          text: Type.String({ minLength: 1, maxLength: 4000 })
        })
      }
    },
    async (req) => {
      const { sessionId, text } = req.body as { sessionId: string; text: string };

      return await withTrace(withLogContext(req.log, { sessionId, requestId: req.id }), async () => {
        let answer = "";
        let hits: any[] = [];
        const stream = streamAssistantReply({
          runtime: app.runtime,
          deps,
          metrics,
          logger: req.log,
          sessionId,
          text
        });
        while (true) {
          const next = await stream.next();
          if (next.done) {
            hits = next.value.hits;
            break;
          }
          if (next.value.type === "token") answer += next.value.token;
        }
        return {
          sessionId,
          answer,
          rag: hits.map((h: any) => ({ id: h.doc.id, title: h.doc.title, score: h.score }))
        };
      });
    }
  );

  app.get(
    "/v1/sse/chat",
    {
      schema: {
        querystring: Type.Object({
          sessionId: Type.String({ minLength: 1 }),
          q: Type.String({ minLength: 1, maxLength: 2000 })
        })
      }
    },
    async (req, reply) => {
      const { sessionId, q } = req.query as { sessionId: string; q: string };
      metrics.sseStreamsTotal.inc();

      reply.raw.setHeader("content-type", "text/event-stream; charset=utf-8");
      reply.raw.setHeader("cache-control", "no-cache, no-transform");
      reply.raw.setHeader("connection", "keep-alive");
      reply.raw.flushHeaders();

      const log = withLogContext(req.log, { sessionId, requestId: req.id });
      await withTrace(log, async () => {
        const abort = new AbortController();
        req.raw.on("close", () => abort.abort());

        const start = performance.now();
        try {
          const stream = streamAssistantReply({
            runtime: app.runtime,
            deps,
            metrics,
            logger: log,
            sessionId,
            text: q
          });

          for await (const chunk of stream) {
            if (abort.signal.aborted) break;
            if (chunk.type === "token") {
              reply.raw.write(`event: token\ndata: ${JSON.stringify({ token: chunk.token })}\n\n`);
            }
            if (chunk.type === "error") {
              reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: chunk.message })}\n\n`);
            }
          }
        } catch (error: any) {
          reply.raw.write(
            `event: error\ndata: ${JSON.stringify({
              message: String(error?.message ?? "stream error")
            })}\n\n`
          );
        } finally {
          metrics.llmGenerationDurationMs.observe(
            { provider: deps.llm.provider, stage: "stream" },
            performance.now() - start
          );

          reply.raw.write(`event: done\ndata: {}\n\n`);
          reply.raw.end();
        }
      });

      return reply;
    }
  );

  app.get(
    "/v1/ws",
    { websocket: true },
    (connection, req) => {
      metrics.wsConnectionsTotal.inc();
      const log = req.log;

      connection.socket.on("message", async (buf: Buffer) => {
        const raw = buf;
        let payload: any;
        try {
          payload = JSON.parse(raw.toString("utf8"));
        } catch {
          connection.socket.send(JSON.stringify({ type: "error", message: "Invalid JSON." }));
          return;
        }

        const sessionId = String(payload.sessionId ?? "");
        const text = String(payload.text ?? "");
        if (!sessionId || !text) {
          connection.socket.send(JSON.stringify({ type: "error", message: "Missing sessionId or text." }));
          return;
        }

        try {
          await withTrace(withLogContext(log, { sessionId, requestId: req.id }), async () => {
            connection.socket.send(JSON.stringify({ type: "start", sessionId }));
            const start = performance.now();
            const stream = streamAssistantReply({
              runtime: app.runtime,
              deps,
              metrics,
              logger: log,
              sessionId,
              text
            });
            for await (const chunk of stream) {
              if (chunk.type === "token") {
                connection.socket.send(JSON.stringify({ type: "token", token: chunk.token }));
              }
              if (chunk.type === "error") {
                connection.socket.send(JSON.stringify({ type: "error", message: chunk.message }));
              }
            }
            metrics.llmGenerationDurationMs.observe(
              { provider: deps.llm.provider, stage: "stream" },
              performance.now() - start
            );
            connection.socket.send(JSON.stringify({ type: "done" }));
          });
        } catch (error: any) {
          connection.socket.send(
            JSON.stringify({ type: "error", message: String(error?.message ?? "ws error") })
          );
          connection.socket.send(JSON.stringify({ type: "done" }));
        }
      });
    }
  );
}
