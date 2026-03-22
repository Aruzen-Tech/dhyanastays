import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true is required for Razorpay webhook HMAC-SHA256 signature verification
  const app = await NestFactory.create(await AppModule.forRoot(), { rawBody: true });

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

  // Graceful shutdown — release port when nodemon restarts or process is terminated
  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  const port = process.env.PORT ?? 3001;
  try {
    await app.listen(port);
    // eslint-disable-next-line no-console
    console.log(`🚀 Dhyana Stays API running on http://localhost:${port}/api`);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(`\n❌ Port ${port} is already in use. Kill the other process first:`);
      // eslint-disable-next-line no-console
      console.error(`   Windows:  netstat -ano | findstr :${port}  then  taskkill /PID <pid> /F`);
      // eslint-disable-next-line no-console
      console.error(`   Linux:    lsof -ti:${port} | xargs kill -9\n`);
      process.exit(1);
    }
    throw err;
  }
}

void bootstrap();
