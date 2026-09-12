import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class AdjustWalletDto {
  @IsIn(['account', 'task', 'referral'])
  walletType!: 'account' | 'task' | 'referral';

  @IsNumberString()
  amount!: string;

  @IsIn(['credit', 'debit'])
  direction!: 'credit' | 'debit';

  @IsString()
  @Length(3, 255)
  description!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
