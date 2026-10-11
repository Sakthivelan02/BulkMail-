const express = require('express');
const mongoose = require('mongoose');
const Mail = require('../models/Mail');
const requireAuth = require('../middleware/auth');
const { sendOne } = require('../utils/mailer');

const router = express.Router();
router.use(requireAuth);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BATCH_SIZE = 10;
const MAX_RECIPIENTS = Number(process.env.MAX_RECIPIENTS) || 500;

// POST /api/mails/send  { subject, body, recipients: string[] }
router.post('/send', async (req, res, next) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.body || '').trim();
    const raw = Array.isArray(req.body.recipients) ? req.body.recipients : [];

    if (!subject) return res.status(400).json({ message: 'Add a subject.' });
    if (!body) return res.status(400).json({ message: 'Write the email body.' });

    // Normalise, de-duplicate, split valid from invalid
    const unique = [...new Set(raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
    const invalid = unique.filter((e) => !EMAIL_RE.test(e));
    const valid = unique.filter((e) => EMAIL_RE.test(e));

    if (invalid.length) {
      return res.status(400).json({ message: `Fix ${invalid.length} invalid address(es) before sending.`, invalid });
    }
    if (!valid.length) return res.status(400).json({ message: 'Add at least one recipient.' });
    if (valid.length > MAX_RECIPIENTS) {
      return res.status(400).json({ message: `You can send to at most ${MAX_RECIPIENTS} recipients at a time.` });
    }

    const mail = await Mail.create({
      subject,
      body,
      recipients: valid.map((email) => ({ email })),
      status: 'sending',
      sentBy: req.user.id,
    });
    console.log(`[mail] ${mail._id} sending to ${valid.length} recipient(s)`);

    // Send in small parallel batches so one slow address doesn't block everyone
    for (let i = 0; i < mail.recipients.length; i += BATCH_SIZE) {
      const batch = mail.recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((r) => sendOne({ to: r.email, subject, body })));
      results.forEach((result, idx) => {
        const r = batch[idx];
        if (result.status === 'fulfilled') {
          r.status = 'sent';
        } else {
          r.status = 'failed';
          r.error = (result.reason && result.reason.message) || 'Unknown error';
          console.error(`[mail] ${mail._id} failed for ${r.email}: ${r.error}`);
        }
      });
    }

    mail.sentCount = mail.recipients.filter((r) => r.status === 'sent').length;
    mail.failedCount = mail.recipients.length - mail.sentCount;
    mail.status = mail.failedCount === 0 ? 'sent' : mail.sentCount === 0 ? 'failed' : 'partial';
    await mail.save();

    console.log(`[mail] ${mail._id} done: ${mail.sentCount} sent, ${mail.failedCount} failed`);

    const message =
      mail.status === 'sent'
        ? `Sent to all ${mail.sentCount} recipient(s).`
        : mail.status === 'partial'
        ? `Sent to ${mail.sentCount}, failed for ${mail.failedCount}. See history for details.`
        : 'No emails were sent. Check your SMTP settings and try again.';

    res.status(mail.status === 'failed' ? 502 : 201).json({ message, mail });
  } catch (err) {
    next(err);
  }
});

// GET /api/mails?page=1&limit=10
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const [items, total] = await Promise.all([
      Mail.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Mail.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    next(err);
  }
});

// GET /api/mails/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
    const mail = await Mail.findById(req.params.id).lean();
    if (!mail) return res.status(404).json({ message: 'Email record not found.' });
    res.json(mail);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/mails/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
    const mail = await Mail.findByIdAndDelete(req.params.id);
    if (!mail) return res.status(404).json({ message: 'Email record not found.' });
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
