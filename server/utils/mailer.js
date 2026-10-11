const BREVO_URL = 'https://api.brevo.com/v3';

function headers() {
  return {
    'api-key': (process.env.BREVO_API_KEY || '').trim(),
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

async function verifyTransport() {
  const key = (process.env.BREVO_API_KEY || '').trim();
  if (!key || !process.env.SENDER_EMAIL) {
    return console.warn('[mail] BREVO_API_KEY / SENDER_EMAIL not set. Emails will not send.');
  }
  console.log(
    `[mail] key length=${key.length}, starts with="${key.slice(0, 9)}", has space=${/\s/.test(key)}, has quote=${/["']/.test(key)}`
  );
  try {
    const res = await fetch(`${BREVO_URL}/account`, { headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    console.log('[mail] Brevo API key verified');
  } catch (err) {
    console.warn('[mail] Brevo check failed:', err.message);
  }
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Plain-text body from the form -> safe HTML that keeps line breaks
const toHtml = (text) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;

async function sendOne({ to, subject, body }) {
  const res = await fetch(`${BREVO_URL}/smtp/email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      sender: {
        email: (process.env.SENDER_EMAIL || '').trim(),
        name: process.env.SENDER_NAME || 'BulkMail',
      },
      to: [{ email: to }],
      subject,
      textContent: body,
      htmlContent: toHtml(body),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Brevo error ${res.status}`);
  }
  return data;
}

module.exports = { sendOne, verifyTransport };