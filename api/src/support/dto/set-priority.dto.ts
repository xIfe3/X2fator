import { IsIn } from 'class-validator';

export class SetPriorityDto {
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority!: 'low' | 'medium' | 'high' | 'urgent';
}
