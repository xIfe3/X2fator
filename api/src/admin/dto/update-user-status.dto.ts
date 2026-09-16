import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['active', 'suspended', 'blocked', 'pending'])
  status!: 'active' | 'suspended' | 'blocked' | 'pending';
}
