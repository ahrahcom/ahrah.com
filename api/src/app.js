import { allowedOrigin, applySecurityHeaders, clientIp, createRateLimiter, readBody } from "./security.js";
import { validateContact } from "./validate.js";

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

export function createApp({ config, sendMail, now = () => Date.now() }) {
  const perIp = createRateLimiter(config.contactLimit, config.contactWindowMs);
  const global = createRateLimiter(config.globalLimit, config.globalWindowMs);

  return async function app(req, res) {
    try {
      const path = new URL(req.url || "/", "http://localhost").pathname;
      applySecurityHeaders(res, config.hsts);
      const origin = allowedOrigin(req, config.origins);
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }

      if ((path === "/" || path === "/api/health") && req.method === "GET") {
        return send(res, 200, { ok: true });
      }

      if (path !== "/api/contact") return send(res, 404, { ok: false, error: "Not found." });

      if (req.method === "OPTIONS") {
        if (!origin) return send(res, 403, { ok: false, error: "This site is not allowed to use the form." });
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Max-Age", "600");
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed." });
      if (!origin) return send(res, 403, { ok: false, error: "This site is not allowed to use the form." });

      const type = typeof req.headers["content-type"] === "string" ? req.headers["content-type"] : "";
      if (!type.toLowerCase().startsWith("application/json")) {
        return send(res, 415, { ok: false, error: "Send the form as JSON." });
      }
      const ip = clientIp(req, config.trustProxy);
      if (!perIp.allow(ip) || !global.allow("all")) {
        res.setHeader("Retry-After", "60");
        return send(res, 429, { ok: false, error: "Too many messages. Please email us instead." });
      }

      const raw = await readBody(req, config.bodyLimit);
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return send(res, 400, { ok: false, error: "We could not read that form." });
      }

      const result = validateContact(data, now(), config);
      if (!result.ok) return send(res, 400, { ok: false, error: result.error });
      if (result.spam) return send(res, 200, { ok: true });

      await sendMail(result.value);
      return send(res, 200, { ok: true });
    } catch (error) {
      const status = error && error.status === 413 ? 413 : 500;
      if (status === 500) console.error("contact request failed");
      return send(res, status, {
        ok: false,
        error: status === 413 ? "That message is too long." : "We could not send that message. Please email business@ahrah.com."
      });
    }
  };
}
