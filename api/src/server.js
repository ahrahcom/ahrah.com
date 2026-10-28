import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadEnvFile, readConfig } from "./env.js";
import { createMailer } from "./mailer.js";

const root = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(root, "..", ".env"));
const config = readConfig();

if (config.nodeEnv === "production" && config.mailMode !== "smtp") {
  console.error("Refusing to start: production requires MAIL_MODE=smtp.");
  process.exit(1);
}
if (config.mailMode === "smtp" && !config.smtpHost) {
  console.error("Refusing to start: set SMTP_HOST, or use MAIL_MODE=log only on your own machine.");
  process.exit(1);
}
if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(config.mailTo)) {
  console.error("Refusing to start: MAIL_TO must be one plain email address.");
  process.exit(1);
}
if (!config.origins.size) {
  console.error("Refusing to start: ALLOWED_ORIGINS is empty.");
  process.exit(1);
}

const server = http.createServer(createApp({ config, sendMail: createMailer(config) }));
server.requestTimeout = 10000;
server.headersTimeout = 5000;
server.maxHeadersCount = 40;
server.listen(config.port, config.host, () => {
  console.log("Ahrah API listening on http://" + config.host + ":" + config.port);
  if (config.host === "0.0.0.0" || config.host === "::") {
    console.error("Warning: the API is listening on all network interfaces. Put it behind HTTPS and a firewall.");
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
