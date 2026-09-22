import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const NOTIFICATION_TYPES = [
  'general',
  'deposit',
  'withdrawal',
  'plan',
  'task',
  'referral',
  'security',
  'system',
  'referral_commission',
  'deposit_completed',
  'withdrawal_completed',
  'withdrawal_rejected',
  'task_approved',
  'task_rejected',
] as const;

export class SendNotificationDto {
  @IsString()
  @Length(1, 255)
  title!: string;

  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: (typeof NOTIFICATION_TYPES)[number];
}
