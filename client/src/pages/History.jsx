import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const LABELS = { sent: 'Sent', partial: 'Partly sent', failed: 'Failed', sending: 'Sending', pending: 'Pending' };
const fmt = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function History({ onAuthError }) {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.listMails(page));
    } catch (err) {
      if (err.status === 401) return onAuthError();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.deleteMail(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <div className="head-row">
        <h1>History</h1>
        <button className="btn ghost" onClick={load}>Refresh</button>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && !error && data.items.length === 0 && (
        <p className="empty">No emails sent yet. Compose your first message to see it here.</p>
      )}

      {data.items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Subject</th><th>Recipients</th><th>Result</th><th>Status</th><th>Date</th><th /></tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <Fragment key={m._id}>
                  <tr>
                    <td className="subj">{m.subject}</td>
                    <td>{m.recipients.length}</td>
                    <td>{m.sentCount} sent, {m.failedCount} failed</td>
                    <td><span className={`badge ${m.status}`}>{LABELS[m.status]}</span></td>
                    <td className="nowrap">{fmt(m.createdAt)}</td>
                    <td className="nowrap">
                      <button className="link" onClick={() => setOpen(open === m._id ? null : m._id)}>
                        {open === m._id ? 'Hide' : 'Details '}
                      </button>
                      <button className="link danger" onClick={() => remove(m._id)}> Delete</button>
                    </td>
                  </tr>
                  {open === m._id && (
                    <tr className="detail">
                      <td colSpan={6}>
                        <p className="pre">{m.body}</p>
                        <ul className="rcpt">
                          {m.recipients.map((r) => (
                            <li key={r.email}>
                              <span className={`dot ${r.status}`} />
                              {r.email}
                              {r.error && <span className="muted small"> ({r.error})</span>}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pages > 1 && (
        <div className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted">Page {data.page} of {data.pages}</span>
          <button className="btn ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
