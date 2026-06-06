import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
let transporterVerified = false;

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
      connectionTimeout: 15_000,  // 15 s to establish TCP
      greetingTimeout: 15_000,    // 15 s for SMTP greeting
      socketTimeout: 30_000       // 30 s idle on the socket
    });

    // Verify the SMTP connection before caching
    try {
      await t.verify();
      console.log('✅ SMTP transporter verified successfully');
      transporter = t;
      transporterVerified = true;
    } catch (verifyErr) {
      console.error('❌ SMTP verification failed:', verifyErr.message);
      console.error('   → Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
      console.error('   → For Gmail: enable 2-Step Verification and create a fresh App Password at https://myaccount.google.com/apppasswords');
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
 * Sends an email message.
 * @param {Object} options
 * @param {string} options.to      - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text]  - Plain text content
 * @param {string} [options.html]  - HTML template
 * @returns {Promise<Object|null>} nodemailer info object, or null on failure
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  // ── Try Resend HTTP API first if configured (bypasses Render SMTP port block) ──
  if (env.email.resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.email.resendApiKey}`
        },
        body: JSON.stringify({
          from: env.email.from,
          to: Array.isArray(to) ? to : [to],
          subject,
          text,
          html
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📧 Email sent via Resend API to ${to} — messageId: ${data.id}`);
        return { messageId: data.id };
      } else {
        const errText = await response.text();
        console.error(`Resend API failed with status ${response.status}:`, errText);
        // Fall back to SMTP if Resend fails
      }
    } catch (apiErr) {
      console.error('Resend API dispatch error, falling back to SMTP:', apiErr.message);
      // Fall back to SMTP if Resend fails
    }
  }

  // ── SMTP fallback ──
  try {
    const mailTransporter = await getTransporter();
    const info = await mailTransporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html
    });
    console.log(`📧 Email sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Email sending failed (to: ${to}):`, error.message);

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
