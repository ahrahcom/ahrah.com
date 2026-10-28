const ALLOWED = new Set(["name", "company", "email", "phone", "message", "company_website", "startedAt"]);
const BLOCKED_KEY = /^(?:__proto__|prototype|constructor)$/;
const LINE_CONTROLS = /[\u0000-\u001F\u007F]/;
const MESSAGE_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const BIDI = /[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/;
const NAME = /^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u;
const COMPANY = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,&'()/-]{1,119}$/u;
const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE = /^\+?[0-9][0-9 ().-]{5,28}$/;

function fail(error) {
  return { ok: false, error };
}

function line(value, max) {
  if (typeof value !== "string") return null;
  const trimmed = value.normalize("NFKC").trim();
  if (!trimmed || trimmed.length > max) return null;
  if (LINE_CONTROLS.test(trimmed) || BIDI.test(trimmed)) return null;
  return trimmed;
}

export function validateContact(input, now, limits) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("We could not read that form.");
  }
  const keys = Object.keys(input);
  if (keys.length > ALLOWED.size || keys.some((key) => BLOCKED_KEY.test(key) || !ALLOWED.has(key))) {
    return fail("The form has a field we do not accept.");
  }
  if (typeof input.company_website === "string" && input.company_website.trim() !== "") {
    return { ok: true, spam: true };
  }

  const started = Number(input.startedAt);
  if (!Number.isFinite(started)) return fail("Reload the page and try again.");
  if (now - started < limits.minFillMs) return fail("Please wait a moment and send the form again.");
  if (started - now > 60000 || now - started > limits.maxAgeMs) return fail("This form expired. Reload the page and try again.");

  const name = line(input.name, 80);
  const company = line(input.company, 120);
  const email = line(input.email, 254);
  const phone = input.phone == null || input.phone === "" ? "" : line(input.phone, 30);
  if (!name || !NAME.test(name)) return fail("Enter your name using letters.");
  if (!company || !COMPANY.test(company)) return fail("Enter a company name.");
  if (!email || !EMAIL.test(email) || email.includes("..")) return fail("Enter a valid work email.");
  if (phone == null || (phone && !PHONE.test(phone))) return fail("Enter a phone number with the country code, or leave it blank.");

  if (typeof input.message !== "string") return fail("Enter a message of at least a sentence.");
  const message = input.message.normalize("NFKC").replace(/\r\n/g, "\n").trim();
  if (message.length < 20 || message.length > 2000) return fail("Enter a message of at least a sentence.");
  if (MESSAGE_CONTROLS.test(message) || BIDI.test(message)) return fail("The message contains characters we cannot accept.");
  if ((message.match(/\n/g) || []).length > 30) return fail("The message contains characters we cannot accept.");

  return { ok: true, spam: false, value: { name, company, email, phone, message } };
}
