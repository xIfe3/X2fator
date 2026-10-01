import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetWithdrawalPinDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter your account password' })
  password!: string;

  @Matches(/^[0-9]{4}$/, { message: 'PIN must be exactly 4 digits' })
  newPin!: string;
}
