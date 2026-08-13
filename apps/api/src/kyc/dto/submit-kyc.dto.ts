import { IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class SubmitKycDto {
  @IsIn(['national_id', 'drivers_license', 'passport', 'voters_card'])
  documentType!: 'national_id' | 'drivers_license' | 'passport' | 'voters_card';

  @IsOptional()
  @IsString()
  @Length(3, 100)
  documentNumber?: string;

  @IsUrl()
  documentUrl!: string;
}
