import { Hono } from "hono";
import { indexSize } from "../services/index-service.js";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    status: "ok",
    ideas: indexSize(),
    uptime: process.uptime(),
  });
});

export { health };
