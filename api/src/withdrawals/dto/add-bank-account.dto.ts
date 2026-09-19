import { IsString, Length } from 'class-validator';

export class AddBankAccountDto {
  @IsString()
  @Length(10, 20)
  accountNumber!: string;

  @IsString()
  @Length(1, 10)
  bankCode!: string;

  @IsString()
  @Length(2, 150)
  bankName!: string;
}
