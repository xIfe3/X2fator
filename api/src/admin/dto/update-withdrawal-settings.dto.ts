import { IsBoolean, IsDateString, IsInt, IsNumberString, IsOptional, Max, Min } from 'class-validator';

export class UpdateWithdrawalSettingsDto {
  @IsOptional()
  @IsNumberString()
  referralMinimumWithdrawal?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  taskWithdrawalDay?: number;

  @IsOptional()
  @IsBoolean()
  autoPayoutEnabled?: boolean;

  @IsOptional()
  @IsNumberString()
  withdrawalFeeFlat?: string;

  @IsOptional()
  @IsNumberString()
  withdrawalFeePercent?: string;

  @IsOptional()
  @IsBoolean()
  planRenewalAfterWithdrawalEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  planRenewalEffectiveFrom?: string;
}
