import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class SubmitKycDto {
  @IsIn(['national_id', 'drivers_license', 'passport', 'voters_card'])
  documentType!: 'national_id' | 'drivers_license' | 'passport' | 'voters_card';

  @IsOptional()
  @IsString()
  @Length(3, 100)
  documentNumber?: string;

  @IsString()
  @Matches(/^(https?:\/\/|\/uploads\/)[^\s]+$/, {
    message: 'documentUrl must be a valid uploaded document URL',
  })
  documentUrl!: string;
}
