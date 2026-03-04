import { resolve } from "path";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  ideasDir: resolve(process.env.IDEAS_DIR || "./ideas"),
  claudeApiKey: process.env.CLAUDE_API_KEY || "",
};
