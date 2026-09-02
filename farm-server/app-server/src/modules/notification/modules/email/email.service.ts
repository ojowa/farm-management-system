import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
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

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get('EMAIL_FROM') || '';
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
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
      if (this.transporter) {
        await this.transporter.sendMail({
          from: this.fromEmail,
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
