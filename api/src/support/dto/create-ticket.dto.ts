import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @Length(3, 255)
  subject!: string;

  @IsString()
  @Length(1, 5000)
  message!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
