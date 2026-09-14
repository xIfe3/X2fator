import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health.controller';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { WalletModule } from './wallet/wallet.module';
import { DepositsModule } from './deposits/deposits.module';
import { PaymentsModule } from './payments/payments.module';
import { ReferralsModule } from './referrals/referrals.module';
import { TasksModule } from './tasks/tasks.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { EarningsModule } from './earnings/earnings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor'; // adjust path
import { HttpExceptionFilter } from './common/filters/http-exception.filter'; // adjust path
import { MailModule } from './mail/mail.module';
import { UploadsModule } from './uploads/uploads.module';
import { SiteContentModule } from './site-content/site-content.module';
import { BonusesModule } from './bonuses/bonuses.module';
import { AdsModule } from './ads/ads.module';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],

      validate: validateEnvironment,

      cache: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    WalletModule,
    DepositsModule,
    PaymentsModule,
    ReferralsModule,
    TasksModule,
    WithdrawalsModule,
    UtilitiesModule,
    EarningsModule,
    NotificationsModule,
    SupportModule,
    AdminModule,
    AuditModule,
    MailModule,
    UploadsModule,
    SiteContentModule,
    BonusesModule,
    AdsModule,
  ],
})
export class AppModule {}
