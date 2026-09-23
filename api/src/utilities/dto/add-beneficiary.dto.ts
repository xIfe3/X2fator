import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class AddBeneficiaryDto {
  @IsIn(['mtn', 'airtel', 'glo', '9mobile'])
  provider!: 'mtn' | 'airtel' | 'glo' | '9mobile';

  @IsString()
  @Length(10, 20)
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  label?: string;
}
