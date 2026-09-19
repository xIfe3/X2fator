import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPermissionsService } from '../common/services/user-permissions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('register/confirm/:paymentReference')
  confirmRegistrationPayment(
    @Param('paymentReference') paymentReference: string,
  ) {
    return this.authService.confirmRegistrationPayment(paymentReference);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register/cancel/:paymentReference')
  cancelRegistrationPayment(
    @Param('paymentReference') paymentReference: string,
  ) {
    return this.authService.cancelRegistrationPayment(paymentReference);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  async me(
    @CurrentUser()
    user: {
      id: string;
      email: string;
      roles: string[];
    },
  ) {
    const permissions = await this.userPermissionsService.getPermissionNames(
      user.id,
    );
    return { ...user, permissions };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Get('telegram-prompt-status')
  getTelegramPromptStatus(@CurrentUser() user: { id: string }) {
    return this.authService.getTelegramPromptStatus(user.id);
  }

  @Post('telegram-prompt-seen')
  markTelegramPromptSeen(@CurrentUser() user: { id: string }) {
    return this.authService.markTelegramPromptSeen(user.id);
  }

  @Post('telegram-joined')
  markTelegramJoined(@CurrentUser() user: { id: string }) {
    return this.authService.markTelegramJoined(user.id);
  }
}
