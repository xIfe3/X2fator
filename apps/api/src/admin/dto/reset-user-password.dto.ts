import { IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
