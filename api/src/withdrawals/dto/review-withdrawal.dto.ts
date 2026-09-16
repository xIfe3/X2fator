import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewWithdrawalDto {
  @IsIn(['processing', 'completed', 'rejected', 'cancelled'])
  status!: 'processing' | 'completed' | 'rejected' | 'cancelled';

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
