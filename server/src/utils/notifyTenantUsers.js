import User from '../models/User.model.js';
import Employee from '../modules/employees/employee.model.js';
import Notification from '../models/Notification.model.js';
import { sendEmail } from './sendEmail.js';

/**
 * Send in-app notification + email to every registered user in a tenant.
 */
export const notifyAllTenantUsers = async ({
  tenantId,
  title,
  content,
  type = 'INFO',
  emailSubject,
  buildEmail
}) => {
  const users = await User.find({ tenantId, isDeleted: { $ne: true } })
    .select('_id email')
    .lean();

  if (users.length === 0) {
    return { usersNotified: 0, emailsSent: 0, emailsFailed: 0 };
  }

  const employees = await Employee.find({ tenantId })
    .select('userId email firstName lastName')
    .lean();
  const employeeByUserId = new Map(employees.map((emp) => [emp.userId.toString(), emp]));

  let usersNotified = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

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
    // Partial success when some docs fail
    if (err.insertedDocs?.length) {
      usersNotified = err.insertedDocs.length;
    }
    console.error('In-app notification broadcast error:', err.message);
  }

  await Promise.all(
    users.map(async (user) => {
      const employee = employeeByUserId.get(user._id.toString());
      const recipientEmail = employee?.email || user.email;

      if (!recipientEmail) {
        emailsFailed += 1;
        return;
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

      if (result) {
        emailsSent += 1;
      } else {
        emailsFailed += 1;
      }
    })
  );

  return { usersNotified, emailsSent, emailsFailed, totalUsers: users.length };
};
