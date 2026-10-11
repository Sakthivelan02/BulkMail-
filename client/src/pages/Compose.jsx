import { useState } from 'react';
import { api } from '../api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Split pasted text on commas, semicolons, spaces and newlines
const parse = (text) => text.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);

export default function Compose({ onAuthError }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [draft, setDraft] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'warning' | 'error', message, failed }

  const addFromText = (text) => {
    const items = parse(text);
    if (!items.length) return;
    setRecipients((prev) => [...new Set([...prev, ...items])]);
    setDraft('');
  };

  const removeRecipient = (email) => setRecipients((prev) => prev.filter((r) => r !== email));
  const invalid = recipients.filter((r) => !EMAIL_RE.test(r));
  const valid = recipients.length - invalid.length;

  const onKeyDown = (e) => {
    if (['Enter', ',', ';', ' '].includes(e.key) && draft.trim()) {
      e.preventDefault();
      addFromText(draft);
    } else if (e.key === 'Backspace' && !draft && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (/[\s,;]/.test(text.trim())) {
      e.preventDefault();
      addFromText(text);
    }
  };

  const validate = () => {
    const e = {};
    if (!subject.trim()) e.subject = 'Add a subject.';
    if (!body.trim()) e.body = 'Write the email body.';
    if (!recipients.length) e.recipients = 'Add at least one recipient.';
    else if (invalid.length) e.recipients = `Remove or fix ${invalid.length} invalid address(es) (shown in red).`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const send = async (e) => {
    e.preventDefault();
    setResult(null);
    // Pick up anything still typed in the box
    if (draft.trim()) addFromText(draft);
    if (!validate()) return;

    setSending(true);
    try {
      const { message, mail } = await api.sendMail({ subject, body, recipients });
      const failed = mail.recipients.filter((r) => r.status === 'failed');
      setResult({ type: mail.status === 'sent' ? 'success' : 'warning', message, failed });
      if (mail.status === 'sent') {
        setSubject(''); setBody(''); setRecipients([]); setErrors({});
      }
    } catch (err) {
      if (err.status === 401) return onAuthError();
      setResult({ type: 'error', message: err.message, failed: [] });
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card airmail" onSubmit={send} noValidate>
      <h1>Compose</h1>
      <p className="muted">Each recipient gets their own copy, so addresses stay private.</p>

      <label htmlFor="to">Recipients</label>
      <div className={`chips ${errors.recipients ? 'has-error' : ''}`} onClick={() => document.getElementById('to').focus()}>
        {recipients.map((r) => (
          <span key={r} className={`chip ${EMAIL_RE.test(r) ? '' : 'bad'}`}>
            {r}
            <button type="button" aria-label={`Remove ${r}`} onClick={() => removeRecipient(r)}>×</button>
          </span>
        ))}
        <input
          id="to"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => addFromText(draft)}
          placeholder={recipients.length ? '' : 'Type or paste addresses, separated by commas or new lines'}
        />
      </div>
      <div className="hint-row">
        {errors.recipients ? <span className="field-error">{errors.recipients}</span> : <span />}
        <span className="muted small">{valid} valid{invalid.length ? `, ${invalid.length} invalid` : ''}</span>
      </div>

      <label htmlFor="subject">Subject</label>
      <input id="subject" className={errors.subject ? 'has-error' : ''} value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
      {errors.subject && <span className="field-error">{errors.subject}</span>}

      <label htmlFor="body">Message</label>
      <textarea id="body" rows={10} className={errors.body ? 'has-error' : ''} value={body} onChange={(e) => setBody(e.target.value)} />
      {errors.body && <span className="field-error">{errors.body}</span>}

      {result && (
        <div className={`alert ${result.type}`} role="status">
          <strong>{result.message}</strong>
          {result.failed.length > 0 && (
            <ul>
              {result.failed.slice(0, 5).map((f) => (
                <li key={f.email}>{f.email}: {f.error}</li>
              ))}
              {result.failed.length > 5 && <li>and {result.failed.length - 5} more in History.</li>}
            </ul>
          )}
        </div>
      )}

      <div className="actions">
        <button className="btn primary" disabled={sending}>
          {sending ? 'Sending…' : `Send to ${valid || ''} ${valid === 1 ? 'recipient' : 'recipients'}`.replace('  ', ' ')}
        </button>
      </div>
    </form>
  );
}
