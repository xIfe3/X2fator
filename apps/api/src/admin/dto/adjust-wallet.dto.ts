import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class AdjustWalletDto {
  @IsIn(['account', 'earnings'])
  walletType!: 'account' | 'earnings';

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
