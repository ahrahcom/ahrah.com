import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { LOGO_CID, renderEnquiry } from "./email.js";

const PLAIN_ADDRESS = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const logo = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../assets/logo.png"));

export function plainAddress(value) {
  const match = String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match && PLAIN_ADDRESS.test(match[0]) ? match[0] : "";
}

export function mailOptions(config, lead, receivedAt = new Date()) {
  const to = plainAddress(config.mailTo);
  const from = plainAddress(config.mailFrom);
  if (!to || !from) throw new Error("mail_address");
  const enquiry = renderEnquiry(lead, receivedAt);
  return {
    from: config.mailFrom,
    to,
    envelope: { from, to },
    replyTo: lead.email,
    subject: enquiry.subject,
    text: enquiry.text,
    html: enquiry.html,
    attachments: [{
      filename: "ahrah-logo.png",
      content: logo,
      cid: LOGO_CID,
      contentType: "image/png",
      contentDisposition: "inline"
    }]
  };
}

export function createMailer(config) {
  if (config.mailMode === "log") {
    return async function logMail(lead) {
      mailOptions(config, lead);
      console.log("enquiry accepted for " + lead.company);
    };
  }

  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: config.smtpPort === 587,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined
  });

  return async function sendMail(lead) {
    await transport.sendMail(mailOptions(config, lead));
  };
}
