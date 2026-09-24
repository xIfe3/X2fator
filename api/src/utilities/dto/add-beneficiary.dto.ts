import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import { IsNigerianPhone } from '../../common/decorators/nigerian-phone.decorator';

export class AddBeneficiaryDto {
  @IsIn(['mtn', 'airtel', 'glo', '9mobile'])
  provider!: 'mtn' | 'airtel' | 'glo' | '9mobile';

  @IsNigerianPhone()
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  label?: string;
}
