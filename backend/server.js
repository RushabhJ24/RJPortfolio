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
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');

// Security middleware
app.use(helmet());

// CORS - MUST be before other middleware
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

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter ONLY for contact endpoint
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 submissions per 15 minutes per IP
  message: { error: 'Too many contact submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
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

// Test endpoint to check SMTP config (remove in production)
app.get("/api/test-smtp", (req, res) => {
  const config = {
    host: process.env.SMTP_HOST ? "✓ Set" : "✗ Missing",
    port: process.env.SMTP_PORT ? "✓ Set" : "✗ Missing",
    user: process.env.SMTP_USER ? "✓ Set" : "✗ Missing",
    pass: process.env.SMTP_PASS ? "✓ Set" : "✗ Missing",
    receiver: process.env.RECEIVER_EMAIL ? "✓ Set" : "✗ Missing"
  };
  res.json({ message: "SMTP Configuration Status", config });
});

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

// Contact endpoint with rate limiting
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
    if (errors.length) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({ ok: false, error: errors.join(' ') });
    }

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

    // Save to file (optional - can be disabled)
    try {
      const fileData = fs.readFileSync(MESSAGES_FILE, 'utf8');
      const arr = JSON.parse(fileData || '[]');
      arr.push(entry);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(arr, null, 2), 'utf8');
      console.log('✅ Message saved to file');
    } catch (fileErr) {
      console.error('⚠️  File save error (non-critical):', fileErr.message);
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️  SMTP not configured, skipping email');
      return res.status(200).json({ 
        ok: true, 
        message: 'Message received and saved (email notification disabled).' 
      });
    }

    // Send email notification
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // For testing; remove in production if using valid certs
        }
      });

      // Verify transporter configuration
      await transporter.verify();
      console.log('✅ SMTP connection verified');

      const mailOptions = {
        from: `"Website Contact" <${process.env.SMTP_USER}>`,
        to: process.env.RECEIVER_EMAIL || process.env.SMTP_USER,
        replyTo: entry.email,
        subject: `New message: ${entry.subject} – ${entry.name}`,
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
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(entry.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(entry.email)}</p>
          <p><strong>Company:</strong> ${escapeHtml(entry.company || '-')}</p>
          <p><strong>Subject:</strong> ${escapeHtml(entry.subject)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(entry.message).replace(/\n/g, '<br/>')}</p>
          <hr/>
          <p><small>Timestamp: ${entry.timestamp}<br/>IP: ${entry.ip}</small></p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully');
      
      return res.status(200).json({ 
        ok: true, 
        message: 'Message saved and notification sent.' 
      });

    } catch (emailErr) {
      console.error('❌ Email sending error:', emailErr.message);
      console.error('Error details:', emailErr);
      
      // Still return success to user, but log the email failure
      return res.status(200).json({ 
        ok: true, 
        message: 'Message received and saved. Email notification may be delayed.' 
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

// GET handler for /api/contact (for testing)
app.get('/api/contact', (req, res) => {
  res.json({ 
    message: 'Contact endpoint is working. Use POST to submit a contact form.',
    method: 'POST',
    requiredFields: ['name', 'email', 'subject', 'message']
  });
});

// Utility function to escape HTML
function escapeHtml(unsafe) {
  return (unsafe || '').replace(/[&<>"'`]/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;'
    })[m];
  });
}

// Admin endpoint to list messages (protect this in production!)
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
  res.status(404).json({ 
    error: 'Not Found', 
    path: req.path,
    availableEndpoints: ['/', '/api/contact', '/api/messages', '/api/test-smtp']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Contact API running on port ${PORT}`);
  console.log(`📧 SMTP Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
  console.log(`📬 Receiver Email: ${process.env.RECEIVER_EMAIL || 'NOT SET'}`);
});