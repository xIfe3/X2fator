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

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumberString()
  reward?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';

  // See CreateTaskDto — requires task_type / target_url columns.
  @IsOptional()
  @IsIn(['video', 'app', 'other'])
  taskType?: 'video' | 'app' | 'other';

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  targetUrl?: string;
}
