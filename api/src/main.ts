import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { runMigrations } from './database';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Applies any pending schema migrations before the app starts serving
  // traffic — required on hosts like cPanel where there's no separate
  // deploy step to run `drizzle-kit migrate` by hand. A migration
  // failure here is fatal: better to fail loudly at boot than run
  // against a schema the code doesn't match.
  try {
    await runMigrations();
    logger.log('Database migrations are up to date.');
  } catch (err) {
    logger.error(
      'Failed to apply database migrations — aborting startup.',
      err instanceof Error ? err.stack : String(err),
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());

  // In production, an unset CORS_ORIGIN must fail closed (no origins
  // allowed) rather than reflect any origin back — `true` is only safe
  // for local development where nothing sensitive is at stake.
  const corsOrigin = process.env.CORS_ORIGIN?.split(',');
  app.enableCors({
    origin: corsOrigin ?? (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Serves uploaded screenshots (task-completion proof, etc.) at
  // /uploads/<filename> — outside the /api prefix, matching the URL
  // shape returned by POST /api/uploads/image.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const config = new DocumentBuilder()
    .setTitle('2xFactor API')
    .setDescription('Sandbox API for the 2xFactor learning project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
