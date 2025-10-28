// server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');

app.use(helmet());
app.use(express.json({ limit: '10kb' })); // small payloads only
app.use(cors()); // adjust origin in production
app.use(express.static(path.join(__dirname, 'public')));

// rate limiter: basic protection
const limiter = rateLimit({
  windowMs: 60*1000, // 1 minute
  max: 10, // max 10 submissions per minute per IP
  message: { error: 'Too many requests, please try again later.' }
});
app.use(cors({
  origin: "*", // frontend origin(s)
  methods: ['GET', 'POST'],
  credentials: true
}));

// Simple server-side validation & sanitation
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

app.post('/api/contact', async (req, res) => {
  try {
    const payload = req.body;
    const errors = validatePayload(payload);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      name: String(payload.name).trim(),
      email: String(payload.email).trim(),
      subject: String(payload.subject).trim(),
      company: payload.company ? String(payload.company).trim() : '',
      message: String(payload.message).trim(),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // append to JSON file
    const fileData = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const arr = JSON.parse(fileData || '[]');
    arr.push(entry);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(arr, null, 2), 'utf8');

    // send email notification
    // nodemailer config uses env vars - set them as instructed below
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"Website Contact" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL, // your email
      replyTo: entry.email,
      subject: `New message: ${entry.subject} — ${entry.name}`,
      text: `
You have received a new message via the website contact form.

Name: ${entry.name}
Email: ${entry.email}
Company: ${entry.company || '-'}
Subject: ${entry.subject}
Message:
${entry.message}

Timestamp: ${entry.timestamp}
IP: ${entry.ip}

-- This is an automated message.
      `,
      html: `<p><strong>Name:</strong> ${escapeHtml(entry.name)}</p>
             <p><strong>Email:</strong> ${escapeHtml(entry.email)}</p>
             <p><strong>Company:</strong> ${escapeHtml(entry.company || '-')}</p>
             <p><strong>Subject:</strong> ${escapeHtml(entry.subject)}</p>
             <p><strong>Message:</strong><br/>${escapeHtml(entry.message).replace(/\n/g,'<br/>')}</p>
             <p><small>Timestamp: ${entry.timestamp}<br/>IP: ${entry.ip}</small></p>`
    };

    // send mail but don't block response too long
    try {
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ ok: true, message: 'Message saved and notification sent.' });
        } catch (err) {
        console.error('Error sending email:', err);
        return res.status(500).json({ error: 'Email failed to send, but message saved.' });
    }


  } catch (err) {
    console.error('Server error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// small utility to escape HTML for email
function escapeHtml(unsafe) {
  return (unsafe || '').replace(/[&<>"'`]/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;', '`':'&#96;'})[m];
  });
}

// Admin endpoint to list messages (very basic; in production protect this)
app.get('/api/messages', (req, res) => {
  try {
    const fileData = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const arr = JSON.parse(fileData || '[]');
    res.json({ count: arr.length, messages: arr });
  } catch (err) {
    res.status(500).json({ error: 'Could not read messages' });
  }
});

app.listen(PORT, () => {
  console.log(`Contact API running on port ${PORT}`);
});
