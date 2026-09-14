import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client | null;
  private readonly bucket?: string;
  private readonly publicUrl?: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('s3.endpoint');
    const accessKeyId = this.configService.get<string>('s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      's3.secretAccessKey',
    );
    this.bucket = this.configService.get<string>('s3.bucket');
    this.publicUrl = this.configService.get<string>('s3.publicUrl');

    const configured =
      endpoint && accessKeyId && secretAccessKey && this.bucket && this.publicUrl;

    if (!configured) {
      this.logger.warn(
        'S3_* env vars are not fully set — uploads will be stored on local ' +
          'disk instead of cloud storage. This will not survive a redeploy ' +
          'and will not scale past one instance. Set S3_ENDPOINT, ' +
          'S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, and ' +
          'S3_PUBLIC_URL before going to production.',
      );
      this.s3 = null;
      return;
    }

    this.s3 = new S3Client({
      endpoint,
      region: 'auto',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  get usingCloudStorage() {
    return this.s3 !== null;
  }

  /**
   * Stores an uploaded file and returns its publicly-reachable URL.
   * Uses S3-compatible cloud storage when configured, otherwise falls
   * back to local disk (dev-only — see the constructor warning).
   */
  async store(file: Express.Multer.File): Promise<string> {
    const filename = `${randomUUID()}${extname(file.originalname)}`;

    if (this.s3 && this.bucket && this.publicUrl) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `${this.publicUrl.replace(/\/$/, '')}/${filename}`;
    }

    const dir = join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), file.buffer);

    return `/uploads/${filename}`;
  }
}
