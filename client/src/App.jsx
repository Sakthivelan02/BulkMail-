import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api, clearToken, getToken } from './api.js';
import Login from './pages/Login.jsx';
import Compose from './pages/Compose.jsx';
import History from './pages/History.jsx';

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  // Restore the session if a token is already stored
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  const logout = () => {
    clearToken();
    setUser(null);
    navigate('/login');
  };

  if (checking) return <p className="boot">Loading…</p>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => { setUser(u); navigate('/'); }} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">Bulk Mail</div>
        <nav>
          <NavLink to="/" end>Compose</NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <div className="who">
          <span>{user.email}</span>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Compose onAuthError={logout} />} />
          <Route path="/history" element={<History onAuthError={logout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
