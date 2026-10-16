const BASE_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 22px; color: white; }
  .content { background-color: #ffffff; padding: 24px; border: 1px solid #e5e7eb; }
  .footer { background-color: #f9fafb; padding: 16px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; }
  .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .detail-label { font-weight: 600; color: #374151; }
  .btn { display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .password-box { background-color: #f0fdf4; border: 2px dashed #16a34a; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0; }
  .password-code { font-size: 24px; font-weight: bold; color: #16a34a; letter-spacing: 2px; font-family: monospace; }
  .alert-box { padding: 12px 16px; border-radius: 6px; margin: 12px 0; }
  .alert-high { background-color: #fef2f2; border-left: 4px solid #ef4444; }
  .alert-medium { background-color: #fffbeb; border-left: 4px solid #f59e0b; }
  .alert-low { background-color: #eff6ff; border-left: 4px solid #3b82f6; }
`;

function wrap(title: string, headerColor: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <div class="container">
    <div class="header" style="background-color:${headerColor};">
      <h1>${title}</h1>
    </div>
    <div class="content">${content}</div>
    <div class="footer">
      <p>Farm Management System &middot; Automated Notification</p>
    </div>
  </div>
  <style>${BASE_STYLE}</style>
</body>
</html>`;
}

export function invitationTemplate(firstName: string, orgName: string, tempPassword: string): { subject: string; html: string } {
  return {
    subject: `You're invited to join ${orgName}`,
    html: wrap(`Welcome to ${orgName}`, '#16a34a', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>You've been invited to join <strong>${orgName}</strong> on the Farm Management System.</p>
      <div class="password-box">
        <p style="margin:0 0 8px;color:#374151;">Your temporary password</p>
        <div class="password-code">${tempPassword}</div>
      </div>
      <p>Use this password to log in, then <strong>change it immediately</strong> from your settings.</p>
      <p style="color:#6b7280;font-size:13px;">If you did not expect this invitation, you can safely ignore this email.</p>
    `),
  };
}

export function welcomeTemplate(firstName: string, orgName: string, role: string): { subject: string; html: string } {
  return {
    subject: `Welcome to ${orgName}`,
    html: wrap(`Welcome aboard, ${firstName}!`, '#16a34a', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>Your account has been created on <strong>${orgName}</strong>'s Farm Management System.</p>
      <div style="margin:16px 0;">
        <div class="detail-row"><span class="detail-label">Organization</span><span>${orgName}</span></div>
        <div class="detail-row"><span class="detail-label">Role</span><span>${role}</span></div>
      </div>
      <p>Log in to get started with managing your farms, crops, livestock, and more.</p>
    `),
  };
}

export function passwordResetTemplate(firstName: string, resetCode: string): { subject: string; html: string } {
  return {
    subject: 'Password Reset Request',
    html: wrap('Password Reset', '#3b82f6', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>We received a request to reset your password. Use the code below:</p>
      <div class="password-box">
        <p style="margin:0 0 8px;color:#374151;">Reset code</p>
        <div class="password-code">${resetCode}</div>
      </div>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p style="color:#6b7280;font-size:13px;">If you didn't request this, ignore this email and your password will remain unchanged.</p>
    `),
  };
}

export function lowStockAlertTemplate(
  firstName: string, farmName: string, items: { name: string; quantity: number; unit: string; minimumQuantity: number }[]
): { subject: string; html: string } {
  const rows = items.map(i => `
    <div class="detail-row">
      <span class="detail-label">${i.name}</span>
      <span>${i.quantity} ${i.unit} remaining (min: ${i.minimumQuantity})</span>
    </div>
  `).join('');

  return {
    subject: `Low Stock Alert - ${farmName}`,
    html: wrap('Low Stock Alert', '#f59e0b', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>The following items on <strong>${farmName}</strong> are below their minimum quantity:</p>
      <div style="margin:16px 0;">${rows}</div>
      <p>Please reorder these items to avoid stockouts.</p>
    `),
  };
}

export function taskAssignmentTemplate(
  assigneeName: string, taskTitle: string, farmName: string, dueDate: string | null, priority: string
): { subject: string; html: string } {
  const priorityColor = priority === 'HIGH' ? '#ef4444' : priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6';
  return {
    subject: `New Task Assigned: ${taskTitle}`,
    html: wrap('New Task Assigned', priorityColor, `
      <p style="font-size:16px;color:#374151;">Hello ${assigneeName},</p>
      <p>You've been assigned a new task on <strong>${farmName}</strong>.</p>
      <div style="margin:16px 0;">
        <div class="detail-row"><span class="detail-label">Task</span><span>${taskTitle}</span></div>
        <div class="detail-row"><span class="detail-label">Priority</span><span style="color:${priorityColor};font-weight:600;">${priority}</span></div>
        ${dueDate ? `<div class="detail-row"><span class="detail-label">Due Date</span><span>${dueDate}</span></div>` : ''}
      </div>
      <p>Log in to view details and update the status.</p>
    `),
  };
}

export function weatherAlertTemplate(firstName: string, farmName: string, alerts: { type: string; severity: string; message: string }[]): { subject: string; html: string } {
  const rows = alerts.map(a => {
    const cls = a.severity === 'HIGH' || a.severity === 'EXTREME' ? 'alert-high' : a.severity === 'MEDIUM' ? 'alert-medium' : 'alert-low';
    return `<div class="alert-box ${cls}"><strong>${a.type}</strong> — ${a.message}</div>`;
  }).join('');

  return {
    subject: `Weather Alert - ${farmName}`,
    html: wrap('Weather Alert', '#6366f1', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>The following weather alerts have been issued for <strong>${farmName}</strong>:</p>
      <div style="margin:16px 0;">${rows}</div>
      <p>Take necessary precautions to protect your crops and livestock.</p>
    `),
  };
}

export function attendanceReminderTemplate(firstName: string, farmName: string): { subject: string; html: string } {
  return {
    subject: 'Daily Attendance Reminder',
    html: wrap('Attendance Reminder', '#8b5cf6', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>This is a reminder to clock in for your shift at <strong>${farmName}</strong>.</p>
      <p>Open the app to record your attendance.</p>
    `),
  };
}

export function leaveStatusTemplate(
  firstName: string, leaveType: string, status: 'APPROVED' | 'REJECTED', days: number, startDate: string, endDate: string, reason?: string
): { subject: string; html: string } {
  const color = status === 'APPROVED' ? '#10b981' : '#ef4444';
  const label = status === 'APPROVED' ? 'Approved' : 'Rejected';
  return {
    subject: `Leave Request ${label}`,
    html: wrap(`Leave Request ${label}`, color, `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>Your leave request has been <strong style="color:${color};">${label}</strong>.</p>
      <div style="margin:16px 0;">
        <div class="detail-row"><span class="detail-label">Type</span><span>${leaveType}</span></div>
        <div class="detail-row"><span class="detail-label">Duration</span><span>${days} day(s)</span></div>
        <div class="detail-row"><span class="detail-label">From</span><span>${startDate}</span></div>
        <div class="detail-row"><span class="detail-label">To</span><span>${endDate}</span></div>
      </div>
      ${reason ? `<div class="alert-box ${status === 'REJECTED' ? 'alert-high' : 'alert-low'}"><strong>Reason:</strong> ${reason}</div>` : ''}
    `),
  };
}

export function broadcastTemplate(firstName: string, title: string, message: string): { subject: string; html: string } {
  return {
    subject: title,
    html: wrap(title, '#1e40af', `
      <p style="font-size:16px;color:#374151;">Hello ${firstName},</p>
      <p>${message}</p>
    `),
  };
}
