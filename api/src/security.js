const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

export function createRateLimiter(limit, windowMs) {
  const hits = new Map();
  return {
    allow(key) {
      const now = Date.now();
      if (hits.size > 5000) {
        for (const [storedKey, times] of hits) {
          if (times.every((time) => now - time >= windowMs)) hits.delete(storedKey);
        }
      }
      const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    }
  };
}

function singleHeader(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isIp(value) {
  if (IPV4.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return value.includes(":") && value.length <= 45 && IPV6.test(value);
}

function isPrivate(ip) {
  const value = ip.replace(/^::ffff:/i, "");
  return value === "127.0.0.1" ||
    value === "::1" ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^f[cd][0-9a-f]{2}:/i.test(value) ||
    value.startsWith("fc") ||
    value.startsWith("fd");
}

export function clientIp(req, trustProxy) {
  const remote = singleHeader(req.socket && req.socket.remoteAddress).replace(/^::ffff:/i, "");
  if (trustProxy && isPrivate(remote)) {
    const forwarded = singleHeader(req.headers["x-forwarded-for"]).split(",")[0].trim().replace(/^::ffff:/i, "");
    if (isIp(forwarded)) return forwarded;
  }
  return remote || "unknown";
}

export function applySecurityHeaders(res, hsts) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cache-Control", "no-store");
  if (hsts) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.removeHeader("X-Powered-By");
}

export function allowedOrigin(req, origins) {
  const origin = singleHeader(req.headers.origin);
  if (!origin || !origins.has(origin)) return "";
  return origin;
}

export function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const fail = (error) => {
      if (done) return;
      done = true;
      req.pause();
      reject(error);
    };
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) fail(Object.assign(new Error("too_large"), { status: 413 }));
      else chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", () => fail(Object.assign(new Error("bad_request"), { status: 400 })));
  });
}
