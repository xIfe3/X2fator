import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { IsNigerianPhone } from '../../common/decorators/nigerian-phone.decorator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username may only contain letters, numbers, and underscores',
  })
  username!: string;

  // Optional when the platform's requirePlanPurchase feature flag is
  // off — registration then activates immediately with no payment.
  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @IsDefined({ message: 'Phone number is required' })
  @IsNigerianPhone()
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  referralCode?: string;
}
