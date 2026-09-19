import { Matches } from 'class-validator';

export class SetWithdrawalPinDto {
  @Matches(/^[0-9]{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin!: string;
}
