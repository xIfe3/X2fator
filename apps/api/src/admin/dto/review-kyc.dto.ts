import { IsOptional, IsString, Length } from 'class-validator';

export class ReviewKycDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reviewNote?: string;
}
