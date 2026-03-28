import type { FastifyInstance } from "fastify";
import type { Deps } from "../server/deps.js";
import { Type } from "@sinclair/typebox";

export function registerSessionRoutes(app: FastifyInstance, deps: Deps) {
  app.post(
    "/v1/sessions",
    {
      schema: {
        body: Type.Optional(
          Type.Object({
            userAgent: Type.Optional(Type.String({ maxLength: 300 }))
          })
        )
      }
    },
    async (req) => {
      const body = (req.body ?? {}) as { userAgent?: string };
      const session = deps.sessions.create(body.userAgent ? { userAgent: body.userAgent } : undefined);
      return { sessionId: session.sessionId, createdAt: session.createdAt };
    }
  );
}
