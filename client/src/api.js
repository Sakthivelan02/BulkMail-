// Small fetch wrapper: adds the auth token and turns API errors into thrown Errors.
const TOKEN_KEY = 'bulkmail_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Local dev: uses the Vite proxy ("/api").
// Production (Vercel): set VITE_API_URL to e.g. https://your-backend.onrender.com/api
// Trailing slashes are removed so we never end up with "//".
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed.');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  sendMail: (payload) => request('/mails/send', { method: 'POST', body: payload }),
  listMails: (page = 1) => request(`/mails?page=${page}&limit=10`),
  deleteMail: (id) => request(`/mails/${id}`, { method: 'DELETE' }),
};