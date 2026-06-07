import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
let transporterVerified = false;

// ── Log email configuration at module load (helps debug Render deployments) ──
console.log('📬 Email configuration:');
console.log(`   Brevo API key: ${env.email.brevo.apiKey ? '✅ configured (' + env.email.brevo.apiKey.substring(0, 8) + '...)' : '❌ NOT configured'}`);
console.log(`   Brevo FROM email: ${env.email.brevo.fromEmail || '(not set)'}`);
console.log(`   Brevo FROM name: ${env.email.brevo.fromName}`);
console.log(`   Resend API key: ${env.email.resendApiKey ? '✅ configured (' + env.email.resendApiKey.substring(0, 8) + '...)' : '❌ NOT configured'}`);
console.log(`   Resend FROM: ${env.email.resendFrom}`);
console.log(`   SMTP host: ${env.email.smtp.host || '(not set)'}`);
console.log(`   SMTP user: ${env.email.smtp.auth.user ? '✅ ' + env.email.smtp.auth.user : '❌ NOT configured'}`);
console.log(`   SMTP FROM: ${env.email.from}`);
console.log(`   Environment: ${env.env}`);

/**
 * Initialize and verify the mail transporter.
 * Verifies the connection on first use. If verification fails,
 * the cached transporter is discarded so the next call can retry.
 */
const getTransporter = async () => {
  if (transporter && transporterVerified) return transporter;

  // Reset stale transporter so we don't cache a broken one
  transporter = null;
  transporterVerified = false;

  if (env.email.smtp.host && env.email.smtp.auth.user) {
    const t = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.port === 465,
      auth: {
        user: env.email.smtp.auth.user,
        pass: env.email.smtp.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      // ── Timeouts so a bad server doesn't hang forever ──
      connectionTimeout: 10_000,  // 10 s to establish TCP
      greetingTimeout: 10_000,    // 10 s for SMTP greeting
      socketTimeout: 15_000       // 15 s idle on the socket
    });

    // Verify the SMTP connection before caching
    try {
      await t.verify();
      console.log('✅ SMTP transporter verified successfully');
      transporter = t;
      transporterVerified = true;
    } catch (verifyErr) {
      console.error('❌ SMTP verification failed:', verifyErr.message);
      console.error('   → This is EXPECTED on Render free tier (outbound SMTP ports 25/465/587 are blocked)');
      console.error('   → Emails will be sent via Resend HTTP API instead');
      // Don't cache a broken transporter — fall through to console fallback
      try { t.close?.(); } catch (_) {}
    }
  }

  // Fallback: log to console so the app never hard-crashes on email
  if (!transporter) {
    console.warn('⚠️  Using console-log email fallback (no working SMTP)');
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n--- EMAIL (console fallback) ---');
        console.log(`From: ${mailOptions.from}`);
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Text: ${mailOptions.text || '(html only)'}`);
        console.log('--------------------------------\n');
        return { messageId: `console-mock-${Date.now()}` };
      },
      close: () => {}
    };
    transporterVerified = true;
  }

  return transporter;
};

/**
 * Send email via Brevo HTTP API.
 * Returns the result object on success, or null on failure.
 */
const sendViaBrevo = async ({ to, subject, text, html }) => {
  const apiKey = env.email.brevo.apiKey;
  if (!apiKey) return null;

  const fromEmail = env.email.brevo.fromEmail;
  const fromName = env.email.brevo.fromName;
  
  // Brevo API expects standard 'to' array of { email, name }
  const recipients = Array.isArray(to) 
    ? to.map(email => ({ email })) 
    : [{ email: to }];

  console.log(`📤 Attempting Brevo API → to: ${JSON.stringify(recipients)}, from: ${fromName} <${fromEmail}>`);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: recipients,
        subject,
        textContent: text,
        htmlContent: html
      })
    });

    const responseBody = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseBody);
      console.log(`📧 Email sent via Brevo API to ${to} — messageId: ${data.messageId}`);
      return { messageId: data.messageId };
    }

    console.error(`❌ Brevo API failed [HTTP ${response.status}]:`, responseBody);
    return null;
  } catch (err) {
    console.error('❌ Brevo API network error:', err.message);
    return null;
  }
};

/**
 * Send email via Resend HTTP API.
 * Returns the result object on success, or null on failure.
 */
const sendViaResend = async ({ to, subject, text, html }) => {
  const apiKey = env.email.resendApiKey;
  if (!apiKey) return null;

  // Use the Resend-specific from address (defaults to onboarding@resend.dev)
  const fromAddress = env.email.resendFrom;
  const recipients = Array.isArray(to) ? to : [to];

  console.log(`📤 Attempting Resend API → to: ${recipients.join(', ')}, from: ${fromAddress}`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        text,
        html
      })
    });

    const responseBody = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseBody);
      console.log(`📧 Email sent via Resend API to ${to} — messageId: ${data.id}`);
      return { messageId: data.id };
    }

    // ── Detailed error logging for common Resend issues ──
    console.error(`❌ Resend API failed [HTTP ${response.status}]:`, responseBody);

    if (response.status === 403) {
      console.error('   → 403 usually means the "from" address domain is not verified in Resend.');
      console.error(`   → Current FROM_EMAIL: "${fromAddress}"`);
      console.error('   → "onboarding@resend.dev" only works for the account owner\'s own email.');
      console.error('   → Fix: Add and verify your own domain in Resend dashboard, then set FROM_EMAIL to an address on that domain.');
    } else if (response.status === 401) {
      console.error('   → 401 means the RESEND_API_KEY is invalid or expired.');
    } else if (response.status === 422) {
      console.error('   → 422 means the request payload is invalid (check from/to addresses).');
    }

    return null;
  } catch (err) {
    console.error('❌ Resend API network error:', err.message);
    return null;
  }
};

/**
 * Sends an email message.
 * Strategy:
 *   1. Try Brevo HTTP API (works on Render — uses HTTPS, bypasses SMTP block)
 *   2. Try Resend HTTP API (works on Render — uses HTTPS, not SMTP ports)
 *   3. Fall back to SMTP transporter (works locally, blocked on Render free tier)
 *
 * @param {Object} options
 * @param {string} options.to      - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text]  - Plain text content
 * @param {string} [options.html]  - HTML template
 * @returns {Promise<Object|null>} info object with messageId, or null on failure
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  // ── 1. Try Brevo HTTP API first (bypasses Render SMTP port block and domain restrictions) ──
  const brevoResult = await sendViaBrevo({ to, subject, text, html });
  if (brevoResult) return brevoResult;

  // ── 2. Try Resend HTTP API next ──
  const resendResult = await sendViaResend({ to, subject, text, html });
  if (resendResult) return resendResult;

  // ── 3. SMTP fallback ──
  try {
    const mailTransporter = await getTransporter();
    const info = await mailTransporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html
    });
    console.log(`📧 Email sent via SMTP to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ SMTP sending failed (to: ${to}):`, error.message);

    // Force re-init on the next attempt
    transporterVerified = false;
    transporter = null;

    return null;
  }
};

/**
 * Force-reset the transporter (useful after env changes or for tests).
 */
export const resetTransporter = () => {
  try { transporter?.close?.(); } catch (_) {}
  transporter = null;
  transporterVerified = false;
};
