import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

// Initialize mail transporter
const getTransporter = async () => {
  if (transporter) return transporter;

  if (env.email.smtp.host && env.email.smtp.auth.user) {
    transporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.port === 465,
      auth: {
        user: env.email.smtp.auth.user,
        pass: env.email.smtp.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else {
    // Ethereal local testing fallback or console fallback
    console.log('SMTP credentials not configured. Falling back to console-logging mail transporter.');
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n--- EMAIL SENT ---');
        console.log(`From: ${mailOptions.from}`);
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Text: ${mailOptions.text}`);
        console.log(`HTML: ${mailOptions.html}`);
        console.log('-------------------\n');
        return { messageId: `console-mock-${Date.now()}` };
      }
    };
  }
  return transporter;
};

/**
 * Sends an email message
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML template
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailTransporter = await getTransporter();
    const info = await mailTransporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html
    });
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return null;
  }
};
