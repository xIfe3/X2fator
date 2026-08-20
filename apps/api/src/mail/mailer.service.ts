// mail/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';

export interface Mailer {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

@Injectable()
export class MailerService implements Mailer {
  private readonly logger = new Logger(MailerService.name);

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    this.logger.log(`[dev] Password reset for ${to}: ${resetUrl}`);
  }
}

export const MAILER = Symbol('MAILER');
