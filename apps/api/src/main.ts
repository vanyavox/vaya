import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  // Cross-origin /assets (Timeweb CDN etc.) must be allowlisted in CSP
  const assetCdn = process.env.ASSET_CDN_ORIGIN?.replace(/\/$/, '');
  const cdnSrc = assetCdn ? [assetCdn] : [];

  app.use(
    helmet({
      // SPA + theme anti-flash script in index.html (inline)
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", ...cdnSrc],
          workerSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'data:', ...cdnSrc],
          imgSrc: ["'self'", 'data:', 'https:', ...cdnSrc],
          fontSrc: ["'self'", 'data:', 'https:', ...cdnSrc],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  const uploadPath = isAbsolute(uploadDir) ? uploadDir : join(process.cwd(), uploadDir);
  mkdirSync(uploadPath, { recursive: true });
  app.useStaticAssets(uploadPath, { prefix: '/uploads/' });

  const webDist = process.env.WEB_DIST || join(process.cwd(), 'public');
  const webIndex = join(webDist, 'index.html');
  if (existsSync(webIndex)) {
    app.useStaticAssets(webDist, { index: false });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(webIndex);
    });
    logger.log(`Serving web from ${webDist}`);
  }

  const config = new DocumentBuilder()
    .setTitle('Vaya API')
    .setDescription('API для приложения Vaya — пространство для пары')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Vaya API running on http://0.0.0.0:${port}/api/v1`);
  logger.log(`Swagger on http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
