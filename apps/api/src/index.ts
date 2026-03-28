import { buildServer } from "./server/buildServer.js";

const server = await buildServer();
await server.listen({ host: server.config.host, port: server.config.port });
