import {
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  reward!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  // What kind of task this is, so the frontend knows whether to show a
  // "watch video" link, an "download app" link, or neither.
  //
  // NOTE: requires a `task_type` text column on the `tasks` table
  // (values: 'video' | 'app' | 'other') in the @2xfactor/database schema.
  @IsOptional()
  @IsIn(['video', 'app', 'other'])
  taskType?: 'video' | 'app' | 'other';

  // The link the user is sent to complete the task (video URL, app store
  // link, etc).
  //
  // NOTE: requires a `target_url` text column on the `tasks` table in the
  // @2xfactor/database schema.
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  targetUrl?: string;
}
