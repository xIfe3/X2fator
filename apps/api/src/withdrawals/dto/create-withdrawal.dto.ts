import { IsNumberString, IsString, Length } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(2, 150)
  bankName!: string;

  @IsString()
  @Length(10, 20)
  accountNumber!: string;

  @IsString()
  @Length(2, 150)
  accountName!: string;
}
