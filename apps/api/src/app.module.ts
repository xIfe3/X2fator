import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health.controller';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { WalletModule } from './wallet/wallet.module';
import { PlansModule } from './plans/plans.module';
import { DepositsModule } from './deposits/deposits.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ReferralsModule } from './referrals/referrals.module';
import { TasksModule } from './tasks/tasks.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { EarningsModule } from './earnings/earnings.module';
import { KycModule } from './kyc/kyc.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor'; // adjust path
import { HttpExceptionFilter } from './common/filters/http-exception.filter'; // adjust path

@Module({
  controllers: [HealthController],
  providers: [
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
    ScheduleModule.forRoot(),
    AuthModule,
    WalletModule,
    PlansModule,
    DepositsModule,
    PaymentsModule,
    SubscriptionsModule,
    ReferralsModule,
    TasksModule,
    WithdrawalsModule,
    UtilitiesModule,
    EarningsModule,
    KycModule,
    NotificationsModule,
    SupportModule,
    AdminModule,
    AuditModule,
  ],
})
export class AppModule {}
