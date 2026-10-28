const FONT = "'Segoe UI', Helvetica, Arial, sans-serif";

export const LOGO_CID = "ahrah-logo@ahrah.com";

const AHRAH = {
  legal: "Ahrah Technologies LLP",
  email: "business@ahrah.com",
  phone: "+91 94448 88327",
  phoneHref: "tel:+919444888327",
  place: "Palacode, Tamil Nadu, India",
  markets: "US · UK · Dubai · India",
  tag: "US · UK · DXB · IN",
  site: "https://ahrah.com",
  linkedin: "https://www.linkedin.com/in/ahrah"
};

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function receivedLabel(date) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kolkata"
  }).format(date);
  return formatted + " IST";
}

function phoneHtml(phone) {
  if (!phone) return `<span style="color:#94a3b8;font-weight:600;">Not provided</span>`;
  const href = "tel:" + phone.replace(/[^\d+]/g, "");
  return `<a href="${href}" style="color:#0f172a;text-decoration:none;">${escapeHtml(phone)}</a>`;
}

function detail(label, valueHtml, edge) {
  const padding = edge === "left" ? "16px 14px 0 0" : "16px 0 0 14px";
  return `<td class="col" width="50%" valign="top" style="width:50%;border-top:1px solid #0f172a;padding:${padding};font-family:${FONT};">
    <div style="font-size:12px;line-height:1.4;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#2f6bff;">${label}</div>
    <div style="padding-top:8px;font-size:18px;line-height:1.45;font-weight:700;color:#0f172a;overflow-wrap:anywhere;">${valueHtml}</div>
  </td>`;
}

export function renderEnquiry(lead, receivedAt = new Date()) {
  const company = escapeHtml(lead.company);
  const name = escapeHtml(lead.name);
  const email = escapeHtml(lead.email);
  const when = escapeHtml(receivedLabel(receivedAt));
  const message = escapeHtml(lead.message).replace(/\n/g, "<br>");
  const phone = lead.phone ? lead.phone : "Not provided";
  const replyHref = "mailto:" + lead.email + "?subject=" + encodeURIComponent("Re: Ahrah project enquiry");

  const text = [
    "Ahrah",
    "New project enquiry",
    "",
    "Company: " + lead.company,
    "Name: " + lead.name,
    "Email: " + lead.email,
    "Phone: " + phone,
    "Received: " + receivedLabel(receivedAt),
    "",
    "Message:",
    lead.message,
    "",
    "Reply to this enquiry: " + lead.email,
    "",
    "—",
    AHRAH.legal,
    AHRAH.place,
    AHRAH.email,
    AHRAH.phone,
    AHRAH.site,
    AHRAH.linkedin,
    AHRAH.markets
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Ahrah project enquiry</title>
<style>
  @media only screen and (max-width: 620px) {
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
    .col { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#1e293b;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">New enquiry from ${company}. ${name}, ${email}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;margin:0;padding:0;">
  <tr>
    <td align="center" class="pad" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;">
        <tr><td height="4" bgcolor="#2f6bff" style="background:#2f6bff;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td class="pad" style="padding:28px 32px 8px;font-family:${FONT};">
            <a href="${AHRAH.site}" style="text-decoration:none;">
              <img src="cid:${LOGO_CID}" width="152" height="36" alt="Ahrah" style="display:block;border:0;outline:none;width:152px;height:36px;">
            </a>
            <div style="padding-top:16px;font-size:12px;line-height:1.4;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#2f6bff;">${AHRAH.tag}</div>
          </td>
        </tr>
        <tr>
          <td class="pad" style="padding:22px 32px 6px;font-family:${FONT};font-size:12px;line-height:1.4;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#2f6bff;">New project enquiry</td>
        </tr>
        <tr>
          <td class="pad" style="padding:0 32px 8px;font-family:${FONT};font-size:28px;line-height:1.25;font-weight:600;color:#0f172a;overflow-wrap:anywhere;">${company}</td>
        </tr>
        <tr>
          <td class="pad" style="padding:0 32px 24px;font-family:${FONT};font-size:14px;line-height:1.5;color:#64748b;">Received ${when}</td>
        </tr>
        <tr>
          <td class="pad" style="padding:0 32px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${detail("Name", name, "left")}
                ${detail("Company", company, "right")}
              </tr>
              <tr>
                ${detail("Email", `<a href="mailto:${email}" style="color:#2f6bff;text-decoration:none;">${email}</a>`, "left")}
                ${detail("Phone", phoneHtml(lead.phone), "right")}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="pad" style="padding:8px 32px 0;font-family:${FONT};">
            <div style="border-top:1px solid #0f172a;padding-top:16px;font-size:12px;line-height:1.4;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#2f6bff;">Message</div>
            <div style="padding:12px 0 8px;font-size:16px;line-height:1.6;font-weight:400;color:#1e293b;overflow-wrap:anywhere;">${message}</div>
          </td>
        </tr>
        <tr>
          <td class="pad" style="padding:18px 32px 32px;font-family:${FONT};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#2f6bff" style="background:#2f6bff;border-radius:999px;">
                  <a href="${replyHref}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;">Reply to ${name}</a>
                </td>
              </tr>
            </table>
            <div style="padding-top:12px;font-size:13px;line-height:1.5;color:#64748b;">Reply is addressed to the sender.</div>
          </td>
        </tr>
        <tr>
          <td class="pad" bgcolor="#070c18" style="background:#070c18;padding:28px 32px;font-family:${FONT};">
            <div style="font-size:15px;line-height:1.5;font-weight:600;color:#ffffff;">${AHRAH.legal}</div>
            <div style="padding-top:6px;font-size:14px;line-height:1.6;color:#94a3b8;">${AHRAH.place}</div>
            <div style="padding-top:10px;font-size:14px;line-height:1.6;">
              <a href="mailto:${AHRAH.email}" style="color:#ffffff;text-decoration:none;">${AHRAH.email}</a>
              <span style="color:#64748b;">&nbsp;&middot;&nbsp;</span>
              <a href="${AHRAH.phoneHref}" style="color:#ffffff;text-decoration:none;">${AHRAH.phone}</a>
            </div>
            <div style="padding-top:10px;font-size:13px;line-height:1.6;color:#94a3b8;">
              <a href="${AHRAH.site}" style="color:#cbd5e1;text-decoration:none;">ahrah.com</a>
              <span style="color:#64748b;">&nbsp;&middot;&nbsp;</span>
              <a href="${AHRAH.linkedin}" style="color:#cbd5e1;text-decoration:none;">LinkedIn</a>
              <span style="color:#64748b;">&nbsp;&middot;&nbsp;</span>
              <span>${AHRAH.markets}</span>
            </div>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;

  return {
    subject: "Ahrah project enquiry from " + lead.company,
    text,
    html
  };
}
