import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export const AD_TYPES = [
  'app_download',
  'followers',
  'subscribers',
  'comments',
  'likes',
] as const;

export type AdType = (typeof AD_TYPES)[number];

export class CreateAdDto {
  @IsIn(AD_TYPES)
  adType!: AdType;

  @IsString() @MaxLength(160) title!: string;

  @IsOptional() @IsString() description?: string;

  @IsUrl({ require_protocol: true }) @MaxLength(2048) targetUrl!: string;

  @IsInt() @Min(1) quantity!: number;
}
