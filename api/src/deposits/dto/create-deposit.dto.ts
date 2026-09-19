import { IsIn, IsNumberString } from 'class-validator';

export class CreateDepositDto {
  @IsNumberString()
  amount!: string;

  @IsIn(['flutterwave'])
  provider!: 'flutterwave';
}
