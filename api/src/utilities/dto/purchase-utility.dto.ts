import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { IsNigerianPhone } from '../../common/decorators/nigerian-phone.decorator';

export class PurchaseUtilityDto {
  @IsIn(['airtime', 'data'])
  type!: 'airtime' | 'data';

  @IsIn(['mtn', 'airtel', 'glo', '9mobile'])
  provider!: 'mtn' | 'airtel' | 'glo' | '9mobile';

  @IsNigerianPhone()
  phoneNumber!: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  productCode?: string;
}
