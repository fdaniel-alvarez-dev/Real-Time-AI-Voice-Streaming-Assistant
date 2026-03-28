import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/v1": { target: "http://127.0.0.1:3001", ws: true },
      "/healthz": { target: "http://127.0.0.1:3001" },
      "/readyz": { target: "http://127.0.0.1:3001" },
      "/metrics": { target: "http://127.0.0.1:3001" }
    }
  }
});
