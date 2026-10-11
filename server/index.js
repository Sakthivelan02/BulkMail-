require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const authRoutes = require('./routes/auth');
const mailRoutes = require('./routes/mail');
const { verifyTransport } = require('./utils/mailer');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/mails', mailRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found.' }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
});

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin seed.');
  const existing = await User.findOne({ email });
  if (existing) return;
  await User.create({ email, password: await bcrypt.hash(password, 10) });
  console.log(`[seed] Admin created: ${email}`);
}

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[db] MongoDB connected');
    await seedAdmin();
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`[server] Listening on http://localhost:${port}`));
    verifyTransport();
  } catch (err) {
    console.error('[startup] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
