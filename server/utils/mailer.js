const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: String(process.env.SMTP_SECURE) !== 'false',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function verifyTransport() {
  try {
    await getTransporter().verify();
    console.log('[mail] SMTP connection verified');
  } catch (err) {
    console.warn('[mail] SMTP check failed. Emails will not send until this is fixed:', err.message);
  }
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Plain-text body from the form -> safe HTML that keeps line breaks
const toHtml = (text) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;

async function sendOne({ to, subject, body }) {
  return getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: body,
    html: toHtml(body),
  });
}

module.exports = { sendOne, verifyTransport };
