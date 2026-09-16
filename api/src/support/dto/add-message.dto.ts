import { IsString, Length } from 'class-validator';

export class AddMessageDto {
  @IsString()
  @Length(1, 5000)
  message!: string;
}
