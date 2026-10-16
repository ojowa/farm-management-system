import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { prisma } from '@farm/database';
import {
  invitationTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  lowStockAlertTemplate,
  taskAssignmentTemplate,
  weatherAlertTemplate,
  attendanceReminderTemplate,
  leaveStatusTemplate,
  broadcastTemplate,
} from './email.templates';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromEmail: string;
  private readonly resendApiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get('EMAIL_FROM') || '';
    this.resendApiKey = this.configService.get('RESEND_API_KEY') || null;
    if (this.resendApiKey && !this.fromEmail) {
      this.logger.warn('RESEND_API_KEY is set but EMAIL_FROM is empty - Resend needs a From address');
    }
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (this.resendApiKey) {
      this.logger.log('Email transport initialized: Resend API');
      return;
    }
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT', '587');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user, pass },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn('SMTP not configured - emails will be logged only');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Precedence: PlatformConfig in the DB (managed from the platform
      // console) overrides the env vars, so keys can be set or rotated at
      // runtime without a redeploy — this also makes Resend work on any
      // host (Render, Vercel, …).
      const from = (await this.getFromAddress()) || this.fromEmail;
      const resendApiKey = await this.getResendApiKey();
      if (resendApiKey) {
        await this.sendViaResend(options, resendApiKey, from);
        this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
        return true;
      } else if (this.transporter) {
        await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
        return true;
      } else {
        this.logger.log(`[EMAIL LOG] To: ${options.to} | Subject: ${options.subject}`);
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Resend HTTP API — the preferred transport whenever a key is configured.
   * Uses the global fetch (Node >= 18), so no extra SDK is pulled in; the
   * From address must be a domain verified in Resend.
   */
  private async sendViaResend(options: EmailOptions, apiKey: string, from: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${detail}`);
    }
  }

  /** DB-backed config (platform console) with environment-variable fallback. */
  private async getFromAddress(): Promise<string | null> {
    return (await this.getPlatformConfigValue('email.from')) || this.configService.get('EMAIL_FROM') || null;
  }

  private async getResendApiKey(): Promise<string | null> {
    return (await this.getPlatformConfigValue('email.resend_api_key')) || this.resendApiKey;
  }

  private async getPlatformConfigValue(key: string): Promise<string | null> {
    try {
      const row = await prisma.platformConfig.findUnique({ where: { key } });
      const value = row?.value;
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    } catch {
      // A config lookup must never block sending — fall back to env.
      return null;
    }
  }

  async sendInvitationEmail(to: string, firstName: string, tempPassword: string, orgName: string): Promise<boolean> {
    const t = invitationTemplate(firstName, orgName, tempPassword);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendWelcomeEmail(to: string, firstName: string, orgName: string, role: string): Promise<boolean> {
    const t = welcomeTemplate(firstName, orgName, role);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetCode: string): Promise<boolean> {
    const t = passwordResetTemplate(firstName, resetCode);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendLowStockAlert(
    to: string, firstName: string, farmName: string,
    items: { name: string; quantity: number; unit: string; minimumQuantity: number }[]
  ): Promise<boolean> {
    const t = lowStockAlertTemplate(firstName, farmName, items);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendTaskAssignment(
    to: string, assigneeName: string, taskTitle: string, farmName: string, dueDate: string | null, priority: string
  ): Promise<boolean> {
    const t = taskAssignmentTemplate(assigneeName, taskTitle, farmName, dueDate, priority);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendWeatherAlert(
    to: string, firstName: string, farmName: string,
    alerts: { type: string; severity: string; message: string }[]
  ): Promise<boolean> {
    const t = weatherAlertTemplate(firstName, farmName, alerts);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendAttendanceReminder(to: string, firstName: string, farmName: string): Promise<boolean> {
    const t = attendanceReminderTemplate(firstName, farmName);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendLeaveStatus(
    to: string, firstName: string, leaveType: string, status: 'APPROVED' | 'REJECTED',
    days: number, startDate: string, endDate: string, reason?: string
  ): Promise<boolean> {
    const t = leaveStatusTemplate(firstName, leaveType, status, days, startDate, endDate, reason);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }

  async sendBroadcast(to: string, firstName: string, title: string, message: string): Promise<boolean> {
    const t = broadcastTemplate(firstName, title, message);
    return this.sendEmail({ to, subject: t.subject, html: t.html });
  }
}
