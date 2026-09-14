// mail/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface Mailer {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  sendWelcome(to: string, firstName: string): Promise<void>;
}

const BRAND_COLOR = '#5b5bf6';

function emailLayout(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background-color:#0a0d16; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0d16; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#10141f; border-radius:16px; overflow:hidden;">
                <tr>
                  <td style="padding:28px 32px 0 32px;">
                    <span style="display:inline-flex; align-items:center; gap:8px; font-size:18px; font-weight:700; color:#f2f4fa;">
                      X2<span style="color:${BRAND_COLOR};">Factor</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 32px 32px; color:#c7cddb; font-size:14px; line-height:22px;">
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px; border-top:1px solid #262e42; color:#5f6b85; font-size:12px;">
                    © ${new Date().getFullYear()} X2Factor. If you didn't expect this email, you can safely ignore it.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buttonHtml(href: string, label: string): string {
  return `
    <a href="${href}" style="display:inline-block; margin-top:16px; padding:12px 24px; background-color:${BRAND_COLOR}; color:#ffffff; font-weight:600; font-size:14px; text-decoration:none; border-radius:10px;">
      ${label}
    </a>
  `;
}

@Injectable()
export class MailerService implements Mailer {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    this.fromEmail =
      this.configService.get<string>('resend.fromEmail') ??
      'X2Factor <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — emails will only be logged, not sent. ' +
          'Set RESEND_API_KEY before going to production.',
      );
    }

    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Password reset for ${to}: ${resetUrl}`);
      return;
    }

    const html = emailLayout(`
      <p style="margin:0 0 4px 0; font-size:18px; font-weight:600; color:#f2f4fa;">Reset your password</p>
      <p style="margin:16px 0 0 0;">We received a request to reset the password on your X2Factor account.</p>
      <p style="margin:8px 0 0 0;">This link expires in 30 minutes and can only be used once.</p>
      ${buttonHtml(resetUrl, 'Reset password')}
      <p style="margin:20px 0 0 0; color:#5f6b85; font-size:12px;">If you didn't request this, no action is needed — your password will stay the same.</p>
    `);

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Reset your X2Factor password',
      html,
    });
  }

  async sendWelcome(to: string, firstName: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Welcome email for ${to} (${firstName})`);
      return;
    }

    const html = emailLayout(`
      <p style="margin:0 0 4px 0; font-size:18px; font-weight:600; color:#f2f4fa;">Welcome, ${firstName} 👋</p>
      <p style="margin:16px 0 0 0;">Your X2Factor account is ready. Complete tasks, refer friends, and keep your daily streak going to start earning.</p>
      <ul style="margin:16px 0 0 0; padding-left:18px; color:#c7cddb;">
        <li style="margin-bottom:6px;">Browse tasks and submit proof for review</li>
        <li style="margin-bottom:6px;">Invite friends with your referral code</li>
        <li>Claim your daily login bonus to build a streak</li>
      </ul>
      ${buttonHtml(this.configService.get<string>('cors.origin') ?? 'https://x2factor.io', 'Go to your dashboard')}
    `);

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Welcome to X2Factor',
      html,
    });
  }
}

export const MAILER = Symbol('MAILER');
