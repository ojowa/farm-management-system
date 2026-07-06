const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005';

export async function sendInvitationEmail(to: string, firstName: string, tempPassword: string, orgName: string) {
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'system',
        type: 'INVITATION',
        title: `You're invited to join ${orgName}`,
        message: `Hello ${firstName},\n\nYou've been invited to join ${orgName} on the Farm Management System.\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately.`,
        channel: 'EMAIL',
        priority: 'HIGH',
        metadata: {
          to,
          subject: `You're invited to join ${orgName}`,
          template: 'invitation',
          templateData: { firstName, tempPassword, orgName },
        },
      }),
    });
  } catch {
    // Email sending is best-effort
  }
}

export async function sendPasswordResetEmail(to: string, firstName: string, resetCode: string) {
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'system',
        type: 'PASSWORD_RESET',
        title: 'Password Reset Request',
        message: `Hello ${firstName},\n\nYour password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.`,
        channel: 'EMAIL',
        priority: 'HIGH',
        metadata: {
          to,
          subject: 'Password Reset Request',
          template: 'passwordReset',
          templateData: { firstName, resetCode },
        },
      }),
    });
  } catch {
    // Email sending is best-effort
  }
}
