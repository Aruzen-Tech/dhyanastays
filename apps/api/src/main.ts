import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true is required for Razorpay webhook HMAC-SHA256 signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — tighten in production via ALLOWED_ORIGINS env var
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Dhyana Stays API running on http://localhost:${port}/api`);
}

void bootstrap();
