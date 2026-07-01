import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
    this.fromEmail = this.configService.get('EMAIL_FROM', 'noreply@farmmanagement.com');
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

  sendLeaveApprovalEmail(
    userEmail: string,
    userName: string,
    leaveType: string,
    days: number,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    const subject = 'Leave Request Approved';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #4b5563; }
          .status-badge { display: inline-block; background-color: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Approved</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your leave request has been <span class="status-badge">Approved</span></p>
            <div style="margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Leave Type:</span>
                <span>${leaveType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span>${days} day(s)</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span>${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span>${endDate}</span>
              </div>
            </div>
            <p>You can view the details in your dashboard.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Farm Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: userEmail, subject, html });
  }

  sendLeaveRejectionEmail(
    userEmail: string,
    userName: string,
    leaveType: string,
    days: number,
    rejectionReason?: string
  ): Promise<boolean> {
    const subject = 'Leave Request Rejected';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #4b5563; }
          .status-badge { display: inline-block; background-color: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
          .reason-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Rejected</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your leave request has been <span class="status-badge">Rejected</span></p>
            <div style="margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Leave Type:</span>
                <span>${leaveType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span>${days} day(s)</span>
              </div>
            </div>
            ${rejectionReason ? `
            <div class="reason-box">
              <strong>Reason for rejection:</strong>
              <p>${rejectionReason}</p>
            </div>
            ` : ''}
            <p>Please contact your manager if you have any questions.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Farm Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: userEmail, subject, html });
  }

  sendNewMessageEmail(
    userEmail: string,
    recipientName: string,
    senderName: string,
    subject: string,
    messageBody: string,
    priority: string
  ): Promise<boolean> {
    const emailSubject = priority === 'URGENT' ? `[URGENT] ${subject}` : priority === 'HIGH' ? `[HIGH] ${subject}` : subject;
    const priorityColor = priority === 'URGENT' ? '#ef4444' : priority === 'HIGH' ? '#f59e0b' : '#3b82f6';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${priorityColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          .message-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .priority-badge { display: inline-block; background-color: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Message${priority !== 'NORMAL' ? ` <span class="priority-badge">${priority}</span>` : ''}</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>You have received a new message from <strong>${senderName}</strong>.</p>
            <div class="message-box">
              <strong>Subject:</strong> ${subject}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
              <p>${messageBody}</p>
            </div>
            <p>Log in to your dashboard to reply.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Farm Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: userEmail, subject: emailSubject, html });
  }
}
