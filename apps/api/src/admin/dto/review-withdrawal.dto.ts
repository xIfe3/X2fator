import { IsOptional, IsString, Length } from 'class-validator';

export class ReviewWithdrawalDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}
