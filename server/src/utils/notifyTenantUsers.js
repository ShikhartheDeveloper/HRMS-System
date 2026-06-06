import User from '../models/User.model.js';
import Employee from '../modules/employees/employee.model.js';
import Notification from '../models/Notification.model.js';
import { sendEmail } from './sendEmail.js';

/**
 * Send in-app notification + email to every registered user in a tenant.
 * Emails are dispatched concurrently for speed.
 */
export const notifyAllTenantUsers = async ({
  tenantId,
  title,
  content,
  type = 'INFO',
  emailSubject,
  buildEmail
}) => {
  // Fetch users and employees in parallel
  const [users, employees] = await Promise.all([
    User.find({ tenantId, isDeleted: { $ne: true } })
      .select('_id email')
      .lean(),
    Employee.find({ tenantId })
      .select('userId email firstName lastName')
      .lean()
  ]);

  if (users.length === 0) {
    return { usersNotified: 0, emailsSent: 0, emailsFailed: 0 };
  }

  // Safe mapping to prevent crashes if emp.userId is null/undefined in some records
  const employeeByUserId = new Map();
  for (const emp of employees) {
    if (emp && emp.userId) {
      employeeByUserId.set(emp.userId.toString(), emp);
    }
  }

  // ── In-app notifications (bulk insert) ──
  let usersNotified = 0;
  try {
    const notificationDocs = users.map((user) => ({
      tenantId,
      userId: user._id,
      title,
      content,
      type,
      read: false
    }));

    const inserted = await Notification.insertMany(notificationDocs, { ordered: false });
    usersNotified = inserted.length;
  } catch (err) {
    if (err.insertedDocs?.length) {
      usersNotified = err.insertedDocs.length;
    }
    console.error('In-app notification broadcast error:', err.message);
  }

  // ── Emails (concurrent dispatch) ──
  const emailResults = await Promise.allSettled(
    users.map(async (user) => {
      const employee = employeeByUserId.get(user._id.toString());
      const recipientEmail = employee?.email || user.email;

      if (!recipientEmail) {
        throw new Error('no-email');
      }

      const firstName = employee?.firstName || user.email?.split('@')[0] || 'Team Member';
      const emailPayload = buildEmail
        ? buildEmail({ user, employee, firstName, recipientEmail })
        : {
            subject: emailSubject || title,
            text: content,
            html: `<p>${content}</p>`
          };

      const result = await sendEmail({
        to: recipientEmail,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html
      });

      if (!result) throw new Error('send-failed');
      return result;
    })
  );

  const emailsSent = emailResults.filter((r) => r.status === 'fulfilled').length;
  const emailsFailed = emailResults.filter((r) => r.status === 'rejected').length;

  return { usersNotified, emailsSent, emailsFailed, totalUsers: users.length };
};
