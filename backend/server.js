// server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { Resend } = require('resend'); // ✅ Using Resend instead of Nodemailer

const app = express();
app.set('trust proxy', 1); // ✅ important for Render proxy
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    "https://rjportfolio-0u3b.onrender.com",
    "http://localhost:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5500"
  ],
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false
}));
app.options(/.*/, cors());

app.use(express.json({ limit: '10kb' }));

// Rate limiter
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many contact submissions. Please try again later.' },
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "Backend working!",
    timestamp: new Date().toISOString(),
    endpoints: {
      contact: "/api/contact (POST)",
      messages: "/api/messages (GET)"
    }
  });
});

// Payload validation
function validatePayload(payload) {
  const errors = [];
  if (!payload) return ['No payload'];
  const { name, email, subject, message } = payload;
  if (!name || name.trim().length < 2) errors.push('Name is required (min 2 chars).');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
  if (!subject) errors.push('Subject is required.');
  if (!message || message.trim().length < 10) errors.push('Message is required (min 10 chars).');
  return errors;
}

// Contact endpoint
app.post('/api/contact', contactLimiter, async (req, res) => {
  console.log('📧 Received contact form submission');
  try {
    const payload = req.body;
    console.log('Payload received:', {
      name: payload?.name,
      email: payload?.email,
      subject: payload?.subject
    });

    const errors = validatePayload(payload);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(' ') });

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: String(payload.name).trim(),
      email: String(payload.email).trim(),
      subject: String(payload.subject).trim(),
      company: payload.company ? String(payload.company).trim() : '',
      message: String(payload.message).trim(),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Save to file
    const fileData = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const arr = JSON.parse(fileData || '[]');
    arr.push(entry);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(arr, null, 2), 'utf8');
    console.log('✅ Message saved to file');

    // ✅ Send email using Resend
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not set, skipping email');
      return res.status(200).json({
        ok: true,
        message: 'Message saved, but email service not configured.'
      });
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: process.env.RECEIVER_EMAIL,
        replyTo: entry.email,
        subject: `New message: ${entry.subject} – ${entry.name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${entry.name}</p>
          <p><strong>Email:</strong> ${entry.email}</p>
          <p><strong>Company:</strong> ${entry.company || '-'}</p>
          <p><strong>Subject:</strong> ${entry.subject}</p>
          <p><strong>Message:</strong><br>${entry.message.replace(/\n/g, '<br>')}</p>
          <hr/>
          <p><small>Timestamp: ${entry.timestamp}<br>IP: ${entry.ip}</small></p>
        `,
      });

      console.log('✅ Email sent successfully via Resend');
      return res.status(200).json({ ok: true, message: 'Message saved and notification sent.' });

    } catch (emailErr) {
      console.error('❌ Resend email error:', emailErr);
      return res.status(200).json({
        ok: true,
        message: 'Message saved. Email notification may be delayed.'
      });
    }

  } catch (err) {
    console.error('❌ Server error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error. Please try again later.'
    });
  }
});

// View messages
app.get('/api/messages', (req, res) => {
  try {
    const fileData = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const arr = JSON.parse(fileData || '[]');
    res.json({ count: arr.length, messages: arr });
  } catch (err) {
    console.error('Error reading messages:', err);
    res.status(500).json({ error: 'Could not read messages' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Contact API running on port ${PORT}`);
  console.log(`📧 Email provider: Resend`);
});
