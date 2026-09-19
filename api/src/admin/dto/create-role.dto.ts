import { IsArray, IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissionNames!: string[];
}
