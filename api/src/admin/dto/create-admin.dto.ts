import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  // The CURRENT admin's own password — required to authorize creating a
  // new admin account. Never the new admin's password twice.
  @IsString()
  currentAdminPassword!: string;
}
