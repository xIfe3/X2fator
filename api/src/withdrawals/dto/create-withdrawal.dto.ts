import { IsIn, IsNumberString, IsString, Length, Matches } from 'class-validator';

export class CreateWithdrawalDto {
  @IsIn(['task', 'referral'])
  walletType!: 'task' | 'referral';

  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(2, 150)
  bankName!: string;

  @IsString()
  @Length(1, 10)
  bankCode!: string;

  @IsString()
  @Length(10, 20)
  accountNumber!: string;

  @IsString()
  @Length(2, 150)
  accountName!: string;

  @Matches(/^[0-9]{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin!: string;
}
