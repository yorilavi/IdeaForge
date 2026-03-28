import { resolve } from "path";
import { existsSync } from "fs";

const tlsCert = resolve(process.env.TLS_CERT || "./certs/tailscale.crt");
const tlsKey = resolve(process.env.TLS_KEY || "./certs/tailscale.key");
const tlsAvailable = existsSync(tlsCert) && existsSync(tlsKey);

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  ideasDir: resolve(process.env.IDEAS_DIR || "./ideas"),
  claudeApiKey: process.env.CLAUDE_API_KEY || "",
  tls: tlsAvailable ? { cert: tlsCert, key: tlsKey } : null,
};
