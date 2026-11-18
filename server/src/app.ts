import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.js";
import { apiRouter } from "./routes/api.js";
import { errorHandler, securityHeaders } from "./middleware/errors.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(cors({ origin: [config.clientOrigin, "http://localhost:5173", "http://127.0.0.1:5173"] }));
  app.use(express.json({ limit: "256kb" }));
  app.use("/api/v1", apiRouter);
  // Production: when the built client exists (client/dist), serve it from this
  // server so the whole app runs as a single service. In local dev the folder
  // is absent and Vite on :5173 serves the client instead — behaviour unchanged.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }
  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } }));
  app.use(errorHandler);
  return app;
}
