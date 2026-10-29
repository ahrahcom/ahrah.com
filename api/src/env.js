import fs from "node:fs";

export function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function inDocker() {
  return fs.existsSync("/.dockerenv");
}

function listenHost() {
  const host = process.env.HOST || (inDocker() ? "0.0.0.0" : "127.0.0.1");
  // 127.0.0.1 inside a container is not the host loopback, so docker -p never reaches the app.
  if (inDocker() && (host === "127.0.0.1" || host === "::1")) return "0.0.0.0";
  return host;
}

function clamp(raw, min, max, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function readConfig() {
  const nodeEnv = process.env.NODE_ENV === "production" ? "production" : "development";
  const origins = (process.env.ALLOWED_ORIGINS || "https://ahrah.com,https://www.ahrah.com")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(item));
  if (nodeEnv !== "production") {
    origins.push("http://127.0.0.1:4174", "http://localhost:4174");
  }
  return {
    nodeEnv,
    host: listenHost(),
    port: clamp(process.env.PORT, 1, 65535, 8787),
    origins: new Set(origins),
    trustProxy: process.env.TRUST_PROXY === "1",
    hsts: process.env.HSTS === "1",
    bodyLimit: clamp(process.env.BODY_LIMIT, 1024, 20000, 8192),
    contactLimit: clamp(process.env.CONTACT_RATE_LIMIT, 1, 30, 5),
    contactWindowMs: clamp(process.env.CONTACT_RATE_WINDOW_MS, 60000, 86400000, 900000),
    globalLimit: clamp(process.env.GLOBAL_RATE_LIMIT, 10, 1000, 100),
    globalWindowMs: clamp(process.env.GLOBAL_RATE_WINDOW_MS, 60000, 86400000, 3600000),
    minFillMs: 2000,
    maxAgeMs: 6 * 60 * 60 * 1000,
    mailMode: process.env.MAIL_MODE === "log" ? "log" : "smtp",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: clamp(process.env.SMTP_PORT, 1, 65535, 587),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    mailFrom: process.env.MAIL_FROM || "Ahrah <business@ahrah.com>",
    mailTo: process.env.MAIL_TO || "business@ahrah.com"
  };
}
