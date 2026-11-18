import { createApp } from "./app.js";
import { config, configWarnings } from "./config/env.js";
import { logInfo } from "./middleware/errors.js";
const app = createApp();
app.listen(config.port, () => {
  logInfo("PolyCompile Pro server started", { port: config.port, clientOrigin: config.clientOrigin, provider: config.executionProvider, geminiConfigured: !!config.geminiApiKey, geminiModel: config.geminiModel });
  for (const w of configWarnings()) logInfo("config warning", { warning: w });
});
