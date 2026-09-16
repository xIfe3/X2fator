import { IsIn, IsNumberString, IsOptional, IsString, Length } from 'class-validator';

export class CreateWithdrawalDto {
  @IsIn(['task', 'referral'])
  walletType!: 'task' | 'referral';

  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(2, 150)
  bankName!: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  bankCode?: string;

  @IsString()
  @Length(10, 20)
  accountNumber!: string;

  @IsString()
  @Length(2, 150)
  accountName!: string;
}
