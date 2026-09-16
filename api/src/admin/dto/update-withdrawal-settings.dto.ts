import { IsInt, IsNumberString, IsOptional, Max, Min } from 'class-validator';

export class UpdateWithdrawalSettingsDto {
  @IsOptional()
  @IsNumberString()
  referralMinimumWithdrawal?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  taskWithdrawalDay?: number;
}
