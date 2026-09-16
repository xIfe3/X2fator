import { IsString, Length } from 'class-validator';

export class VerifyAccountDto {
  @IsString()
  @Length(10, 20)
  accountNumber!: string;

  @IsString()
  @Length(1, 10)
  bankCode!: string;
}
