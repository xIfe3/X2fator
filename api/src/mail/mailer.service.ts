// mail/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface Mailer {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  sendWelcome(to: string, firstName: string): Promise<void>;
  sendDepositSuccessful(
    to: string,
    firstName: string,
    amount: string,
  ): Promise<void>;
  sendDepositFailed(
    to: string,
    firstName: string,
    amount: string,
    reason?: string,
  ): Promise<void>;
  sendWithdrawalRequested(
    to: string,
    firstName: string,
    amount: string,
  ): Promise<void>;
  sendWithdrawalApproved(
    to: string,
    firstName: string,
    amount: string,
  ): Promise<void>;
  sendWithdrawalRejected(
    to: string,
    firstName: string,
    amount: string,
    reason?: string,
  ): Promise<void>;
  sendAdApproved(to: string, firstName: string, adTitle: string): Promise<void>;
  sendAdRejected(
    to: string,
    firstName: string,
    adTitle: string,
    reason?: string,
  ): Promise<void>;
  sendTaskApproved(
    to: string,
    firstName: string,
    taskTitle: string,
    reward: string,
  ): Promise<void>;
  sendTaskRejected(
    to: string,
    firstName: string,
    taskTitle: string,
    reason?: string,
  ): Promise<void>;
  sendWithdrawalPinChanged(to: string, firstName: string): Promise<void>;
  sendWithdrawalPinResetByAdmin(
    to: string,
    firstName: string,
    message?: string,
  ): Promise<void>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Matches the app's teal brand color (see web/src/app/globals.css --color-primary).
const BRAND_COLOR = '#1f8b93';
const BRAND_COLOR_SOFT = '#10262b';
const LOGO_URL = 'https://x2factor.com/_next/image?url=%2Ffavicon.png&w=64&q=75';

function emailLayout(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background-color:#0a121e; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a121e; padding:40px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
                <tr>
                  <td align="center" style="padding:0 0 28px 0;">
                    <img
                      src="${LOGO_URL}"
                      width="40"
                      height="40"
                      alt="X2Factor"
                      style="display:inline-block; vertical-align:middle; border-radius:10px;"
                    />
                    <span style="display:inline-block; vertical-align:middle; margin-left:10px; font-size:18px; font-weight:700; color:#f2f5fa;">
                      X2<span style="color:${BRAND_COLOR};">Factor</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#142438; border:1px solid #24384f; border-radius:16px; overflow:hidden;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="height:4px; background-color:${BRAND_COLOR};"></td>
                      </tr>
                      <tr>
                        <td style="padding:32px; color:#94a4bc; font-size:14px; line-height:22px;">
                          ${bodyHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:20px 12px 0 12px; color:#5c6f8a; font-size:12px; line-height:18px;">
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

function formatNaira(amount: string): string {
  const value = Number(amount);
  return `NGN ${Number.isFinite(value) ? value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : amount}`;
}

function heading(text: string): string {
  return `<p style="margin:0 0 4px 0; font-size:19px; font-weight:600; color:#f2f5fa;">${text}</p>`;
}

function buttonHtml(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="border-radius:10px; background-color:${BRAND_COLOR};">
          <a href="${href}" style="display:inline-block; padding:12px 26px; color:#ffffff; font-weight:600; font-size:14px; text-decoration:none;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function amountPill(text: string): string {
  return `<span style="display:inline-block; padding:2px 8px; background-color:${BRAND_COLOR_SOFT}; color:${BRAND_COLOR}; border-radius:6px; font-weight:600;">${text}</span>`;
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

  /**
   * The Resend SDK never throws on a rejected send — a bad/unverified
   * `from` domain, invalid recipient, etc. all resolve successfully
   * with `{ data: null, error: {...} }`. Every send goes through here
   * so a rejection actually surfaces as a thrown error instead of
   * silently vanishing while callers believe the email went out.
   */
  private async send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const { error } = await this.resend!.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      throw new Error(
        `Resend rejected email to ${params.to} ("${params.subject}"): ${error.message}`,
      );
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Password reset for ${to}: ${resetUrl}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Reset your password')}
      <p style="margin:16px 0 0 0;">We received a request to reset the password on your X2Factor account.</p>
      <p style="margin:8px 0 0 0;">This link expires in 30 minutes and can only be used once.</p>
      ${buttonHtml(resetUrl, 'Reset password')}
      <p style="margin:20px 0 0 0; color:#5c6f8a; font-size:12px;">If you didn't request this, no action is needed — your password will stay the same.</p>
    `);

    await this.send({
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
      ${heading(`Welcome, ${firstName} 👋`)}
      <p style="margin:16px 0 0 0;">Your X2Factor account is ready. Complete tasks, refer friends, and keep your daily streak going to start earning.</p>
      <ul style="margin:16px 0 0 0; padding-left:18px; color:#94a4bc;">
        <li style="margin-bottom:6px;">Browse tasks and submit proof for review</li>
        <li style="margin-bottom:6px;">Invite friends with your referral code</li>
        <li>Claim your daily login bonus to build a streak</li>
      </ul>
      ${buttonHtml(this.configService.get<string>('cors.origin') ?? 'https://x2factor.io', 'Go to your dashboard')}
    `);

    await this.send({
      to,
      subject: 'Welcome to X2Factor',
      html,
    });
  }

  private get dashboardUrl(): string {
    return this.configService.get<string>('cors.origin') ?? 'https://x2factor.io';
  }

  async sendDepositSuccessful(
    to: string,
    firstName: string,
    amount: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Deposit successful for ${to}: ${amount}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Deposit successful')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your deposit of ${amountPill(formatNaira(amount))} has been confirmed and added to your account wallet.</p>
      ${buttonHtml(`${this.dashboardUrl}/wallet`, 'View wallet')}
    `);

    await this.send({
      to,
      subject: 'Your deposit was successful',
      html,
    });
  }

  async sendDepositFailed(
    to: string,
    firstName: string,
    amount: string,
    reason?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Deposit failed for ${to}: ${amount}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Deposit failed')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your deposit of ${amountPill(formatNaira(amount))} could not be completed.${reason ? ` Reason: ${reason}.` : ''}</p>
      <p style="margin:8px 0 0 0;">No funds were added to your wallet. If you were charged, please contact support.</p>
      ${buttonHtml(`${this.dashboardUrl}/deposits`, 'Try again')}
    `);

    await this.send({
      to,
      subject: 'Your deposit could not be completed',
      html,
    });
  }

  async sendWithdrawalRequested(
    to: string,
    firstName: string,
    amount: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Withdrawal requested for ${to}: ${amount}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Withdrawal request received')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, we've received your withdrawal request for ${amountPill(formatNaira(amount))}. It's now being processed.</p>
      ${buttonHtml(`${this.dashboardUrl}/withdrawals`, 'Track request')}
    `);

    await this.send({
      to,
      subject: 'Withdrawal request received',
      html,
    });
  }

  async sendWithdrawalApproved(
    to: string,
    firstName: string,
    amount: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Withdrawal approved for ${to}: ${amount}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Withdrawal approved')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your withdrawal of ${amountPill(formatNaira(amount))} has been approved and is on its way to your bank account.</p>
      ${buttonHtml(`${this.dashboardUrl}/withdrawals`, 'View details')}
    `);

    await this.send({
      to,
      subject: 'Your withdrawal was approved',
      html,
    });
  }

  async sendWithdrawalRejected(
    to: string,
    firstName: string,
    amount: string,
    reason?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Withdrawal rejected for ${to}: ${amount}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Withdrawal rejected')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your withdrawal request for ${amountPill(formatNaira(amount))} was rejected.${reason ? ` Reason: ${reason}.` : ''}</p>
      <p style="margin:8px 0 0 0;">The funds have been returned to your wallet.</p>
      ${buttonHtml(`${this.dashboardUrl}/withdrawals`, 'View wallet')}
    `);

    await this.send({
      to,
      subject: 'Your withdrawal was rejected',
      html,
    });
  }

  async sendAdApproved(
    to: string,
    firstName: string,
    adTitle: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Ad approved for ${to}: ${adTitle}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Your ad was approved')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your ad "<strong style="color:#f2f5fa;">${adTitle}</strong>" has been approved and is now live for other users to complete.</p>
      ${buttonHtml(`${this.dashboardUrl}/ads`, 'View your ads')}
    `);

    await this.send({
      to,
      subject: 'Your ad was approved',
      html,
    });
  }

  async sendAdRejected(
    to: string,
    firstName: string,
    adTitle: string,
    reason?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Ad rejected for ${to}: ${adTitle}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Your ad was rejected')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your ad "<strong style="color:#f2f5fa;">${adTitle}</strong>" was not approved.${reason ? ` Reason: ${reason}.` : ''}</p>
      ${buttonHtml(`${this.dashboardUrl}/ads`, 'View your ads')}
    `);

    await this.send({
      to,
      subject: 'Your ad was rejected',
      html,
    });
  }

  async sendTaskApproved(
    to: string,
    firstName: string,
    taskTitle: string,
    reward: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Task approved for ${to}: ${taskTitle}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Task approved')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your submission for "<strong style="color:#f2f5fa;">${taskTitle}</strong>" was approved. ${amountPill(formatNaira(reward))} has been added to your task wallet.</p>
      ${buttonHtml(`${this.dashboardUrl}/tasks`, 'Find more tasks')}
    `);

    await this.send({
      to,
      subject: 'Your task submission was approved',
      html,
    });
  }

  async sendTaskRejected(
    to: string,
    firstName: string,
    taskTitle: string,
    reason?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Task rejected for ${to}: ${taskTitle}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Task submission rejected')}
      <p style="margin:16px 0 0 0;">Hi ${firstName}, your submission for "<strong style="color:#f2f5fa;">${taskTitle}</strong>" was not approved.${reason ? ` Reason: ${reason}.` : ''}</p>
      ${buttonHtml(`${this.dashboardUrl}/tasks`, 'Try another task')}
    `);

    await this.send({
      to,
      subject: 'Your task submission was rejected',
      html,
    });
  }

  async sendWithdrawalPinChanged(to: string, firstName: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Withdrawal PIN changed for ${to}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Your withdrawal PIN was changed')}
      <p style="margin:16px 0 0 0;">Hi ${escapeHtml(firstName)}, the withdrawal PIN on your X2Factor account was just changed.</p>
      <p style="margin:8px 0 0 0;">If this wasn't you, change your password right away and contact support.</p>
      ${buttonHtml(`${this.dashboardUrl}/support`, 'Contact support')}
    `);

    await this.send({
      to,
      subject: 'Your withdrawal PIN was changed',
      html,
    });
  }

  async sendWithdrawalPinResetByAdmin(
    to: string,
    firstName: string,
    message?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev] Withdrawal PIN reset by admin for ${to}`);
      return;
    }

    const html = emailLayout(`
      ${heading('Your withdrawal PIN was reset')}
      <p style="margin:16px 0 0 0;">Hi ${escapeHtml(firstName)}, our support team has reset the withdrawal PIN on your X2Factor account.</p>
      <p style="margin:8px 0 0 0;">You'll be asked to set a new 4-digit PIN the next time you make a withdrawal.</p>
      ${
        message
          ? `<p style="margin:16px 0 0 0; padding:12px 14px; background-color:#0f1c2d; border-radius:10px; color:#f2f5fa; white-space:pre-line;">${escapeHtml(message)}</p>`
          : ''
      }
      ${buttonHtml(`${this.dashboardUrl}/withdrawals`, 'Set a new PIN')}
    `);

    await this.send({
      to,
      subject: 'Your withdrawal PIN was reset',
      html,
    });
  }
}

export const MAILER = Symbol('MAILER');
