import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyTaskLimit?: number;

  @IsOptional()
  @IsNumberString()
  dailyReward?: string;

  @IsOptional()
  @IsNumberString()
  referralRewardRate?: string;

  @IsOptional()
  @IsNumberString()
  minimumWithdrawal?: string;

  @IsOptional()
  @IsIn(['draft', 'active', 'inactive'])
  status?: 'draft' | 'active' | 'inactive';

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
