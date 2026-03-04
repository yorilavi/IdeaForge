import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { config } from "./lib/config.js";
import { ideas } from "./routes/ideas.js";
import { health } from "./routes/health.js";
import { categories } from "./routes/categories.js";
import { initializeIndex } from "./services/idea-service.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("/api/*", cors());

// API routes
app.route("/api/ideas", ideas);
app.route("/api/categories", categories);
app.route("/api/health", health);

// Serve static client files
app.use("/*", serveStatic({ root: "./src/client" }));
app.get("*", serveStatic({ path: "./src/client/index.html" }));

// Start
const start = async () => {
  const count = await initializeIndex();
  console.log(`Indexed ${count} ideas from ${config.ideasDir}`);
  console.log(`IdeaForge running at http://localhost:${config.port}`);
};

start();

export default {
  port: config.port,
  fetch: app.fetch,
};
