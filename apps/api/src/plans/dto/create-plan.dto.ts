import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  price!: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

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
