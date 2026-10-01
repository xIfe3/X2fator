import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResetUserPinDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Message must be 1000 characters or fewer' })
  message?: string;
}
