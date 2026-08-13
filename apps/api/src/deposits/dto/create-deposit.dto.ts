import { IsIn, IsNumberString } from 'class-validator';

export class CreateDepositDto {
  @IsNumberString()
  amount!: string;

  @IsIn(['paystack', 'flutterwave', 'manual', 'mock'])
  provider!: 'paystack' | 'flutterwave' | 'manual' | 'mock';
}
