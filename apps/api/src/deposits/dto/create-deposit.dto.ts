import { IsIn, IsNumberString } from 'class-validator';

export class CreateDepositDto {
  @IsNumberString()
  amount!: string;

  @IsIn(['flutterwave', 'manual', 'mock'])
  provider!: 'flutterwave' | 'manual' | 'mock';
}
