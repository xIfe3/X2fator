import { Module } from '@nestjs/common';

import { MAILER, MailerService } from './mailer.service';

@Module({
  providers: [
    MailerService,
    {
      provide: MAILER,
      useExisting: MailerService,
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
