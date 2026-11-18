import express from "express";
import cors from "cors";
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
  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } }));
  app.use(errorHandler);
  return app;
}
