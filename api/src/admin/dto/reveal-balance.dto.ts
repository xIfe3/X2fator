import { IsString, Length } from 'class-validator';

export class RevealBalanceDto {
  @IsString()
  @Length(1, 72)
  password!: string;
}
