const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const mailSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    recipients: { type: [recipientSchema], validate: (v) => v.length > 0 },
    // sending -> sent (all ok) | partial (some failed) | failed (all failed)
    status: { type: String, enum: ['pending', 'sending', 'sent', 'partial', 'failed'], default: 'pending' },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mailSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Mail', mailSchema);
