import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { eq } from 'drizzle-orm';

import { db, users } from '../../database';
import { PasswordService } from '../../auth/password.service';
import { FlutterwaveAccountsService } from '../../withdrawals/flutterwave-accounts.service';

import { RevealBalanceDto } from '../dto/reveal-balance.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/required-permission.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@Controller('admin/flutterwave')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminFlutterwaveController {
  private readonly logger = new Logger(AdminFlutterwaveController.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly flutterwaveAccountsService: FlutterwaveAccountsService,
  ) {}

  /**
   * Returns the live Flutterwave NGN balance, but only after the admin
   * re-enters their own password — a logged-in session alone isn't
   * enough to see it. Throttled to slow down password guessing.
   */
  @Post('balance')
  @HttpCode(200)
  @RequirePermission('flutterwave.balance')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async revealBalance(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RevealBalanceDto,
  ) {
    const admin = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    const passwordOk =
      !!admin?.passwordHash &&
      (await this.passwordService.compare(dto.password, admin.passwordHash));

    if (!passwordOk) {
      this.logger.warn(
        `Failed Flutterwave balance reveal attempt by ${currentUser.email}`,
      );
      // 403, not 401 — the web client treats any 401 as an expired
      // session and would log the admin out over a mistyped password.
      throw new ForbiddenException('Incorrect password');
    }

    this.logger.log(`Flutterwave balance revealed to ${currentUser.email}`);

    const balance = await this.flutterwaveAccountsService.getNgnBalance();
    return { currency: 'NGN', ...balance, fetchedAt: new Date() };
  }
}
