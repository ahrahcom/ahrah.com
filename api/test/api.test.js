import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";
import { mailOptions } from "../src/mailer.js";

const origin = "http://127.0.0.1:4174";

function config(overrides = {}) {
  return {
    origins: new Set([origin]),
    trustProxy: false,
    hsts: false,
    bodyLimit: 8192,
    contactLimit: 5,
    contactWindowMs: 900000,
    globalLimit: 100,
    globalWindowMs: 3600000,
    minFillMs: 2000,
    maxAgeMs: 6 * 60 * 60 * 1000,
    ...overrides
  };
}

function lead(overrides = {}) {
  return {
    name: "Harsika",
    company: "Northwind Labs",
    email: "ada@northwind.example",
    phone: "+1 202 555 0148",
    message: "We need a first release of our billing portal for US customers.",
    company_website: "",
    startedAt: Date.now() - 10000,
    ...overrides
  };
}

function listen(app) {
  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function request(server, { method = "POST", path = "/api/contact", headers = {}, body }) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port: address.port,
      path,
      method,
      headers: { Origin: origin, "Content-Type": "application/json", ...headers }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, json, raw });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

test("health reports nothing but ok, and sets security headers", async () => {
  const server = await listen(createApp({ config: config(), sendMail: async () => {} }));
  try {
    const res = await request(server, { method: "GET", path: "/api/health", headers: { Origin: "" } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { ok: true });
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["cross-origin-resource-policy"], "cross-origin");
    assert.equal(res.headers["x-frame-options"], "DENY");
    assert.equal(res.headers["x-powered-by"], undefined);
    assert.equal(res.raw.includes("node"), false);
  } finally {
    server.close();
  }
});

test("a valid enquiry is emailed once", async () => {
  const sent = [];
  const server = await listen(createApp({ config: config(), sendMail: async (lead) => sent.push(lead) }));
  try {
    const res = await request(server, { body: JSON.stringify(lead()) });
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].email, "ada@northwind.example");
  } finally {
    server.close();
  }
});

test("a filled honeypot looks successful and is not emailed", async () => {
  const sent = [];
  const server = await listen(createApp({ config: config(), sendMail: async (lead) => sent.push(lead) }));
  try {
    const res = await request(server, { body: JSON.stringify(lead({ company_website: "https://spam.example" })) });
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(sent.length, 0);
  } finally {
    server.close();
  }
});

test("header injection and unexpected fields are rejected", async () => {
  const sent = [];
  const server = await listen(createApp({ config: config(), sendMail: async (lead) => sent.push(lead) }));
  try {
    const injected = await request(server, { body: JSON.stringify(lead({ email: "ada@northwind.example\r\nBcc: evil@example.com" })) });
    assert.equal(injected.status, 400);
    const extra = await request(server, { body: '{"name":"Ada","__proto__":{"admin":true},"role":"admin"}' });
    assert.equal(extra.status, 400);
    assert.equal(sent.length, 0);
    assert.equal(injected.raw.includes("Bcc"), false);
  } finally {
    server.close();
  }
});

test("another website cannot submit the form", async () => {
  const server = await listen(createApp({ config: config(), sendMail: async () => { throw new Error("should not send"); } }));
  try {
    const res = await request(server, { headers: { Origin: "https://evil.example" }, body: JSON.stringify(lead()) });
    assert.equal(res.status, 403);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  } finally {
    server.close();
  }
});

test("the sixth enquiry from one address is rate limited", async () => {
  const server = await listen(createApp({
    config: config({ contactLimit: 2 }),
    sendMail: async () => {}
  }));
  try {
    assert.equal((await request(server, { body: JSON.stringify(lead()) })).status, 200);
    assert.equal((await request(server, { body: JSON.stringify(lead()) })).status, 200);
    const blocked = await request(server, { body: JSON.stringify(lead()) });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers["retry-after"], "60");
  } finally {
    server.close();
  }
});

test("oversized, mistyped, and unknown requests are refused", async () => {
  const server = await listen(createApp({ config: config({ bodyLimit: 100 }), sendMail: async () => {} }));
  try {
    const large = await request(server, { body: "x".repeat(200) });
    assert.equal(large.status, 413);
    const typed = await request(server, { headers: { "Content-Type": "text/plain" }, body: "name=ada" });
    assert.equal(typed.status, 415);
    const missing = await request(server, { method: "GET", path: "/api/admin" });
    assert.equal(missing.status, 404);
    const wrong = await request(server, { method: "PUT", body: "{}" });
    assert.equal(wrong.status, 405);
  } finally {
    server.close();
  }
});

test("the visitor cannot choose who receives the email", () => {
  const options = mailOptions({
    mailFrom: "Ahrah <business@ahrah.com>",
    mailTo: "business@ahrah.com"
  }, {
    name: "Ada Lovelace",
    company: "A&B Labs",
    email: "ada@northwind.example",
    phone: "",
    message: "We need a first release <script>alert(1)</script> for US customers."
  }, new Date("2026-10-28T15:30:00Z"));
  assert.equal(options.to, "business@ahrah.com");
  assert.deepEqual(options.envelope, { from: "business@ahrah.com", to: "business@ahrah.com" });
  assert.equal(options.replyTo, "ada@northwind.example");
  assert.equal(options.subject, "Ahrah project enquiry from A&B Labs");
  assert.equal(options.html.includes("<script>"), false);
  assert.equal(options.html.includes("&lt;script&gt;"), true);
  assert.equal(options.html.includes("A&amp;B Labs"), true);
  assert.equal(options.html.includes("cid:ahrah-logo@ahrah.com"), true);
  assert.equal(options.html.includes("business@ahrah.com"), true);
  assert.equal(options.html.includes("+91 94448 88327"), true);
  assert.equal(options.html.includes("Ahrah Technologies LLP"), true);
  assert.equal(options.text.includes("Ada Lovelace"), true);
  assert.equal(options.text.includes("28 October 2026"), true);
  assert.equal(options.attachments[0].cid, "ahrah-logo@ahrah.com");
  assert.equal(options.attachments[0].content.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});

test("a mail failure stays generic and does not leak the cause", async () => {
  const server = await listen(createApp({
    config: config(),
    sendMail: async () => { throw new Error("smtp password hunter2"); }
  }));
  try {
    const res = await request(server, { body: JSON.stringify(lead()) });
    assert.equal(res.status, 500);
    assert.equal(res.raw.includes("hunter2"), false);
    assert.equal(res.raw.includes("smtp"), false);
  } finally {
    server.close();
  }
});
