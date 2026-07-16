import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';

async function bootstrap() {
  // rawBody: true is required for Razorpay webhook HMAC-SHA256 signature verification
  const app = await NestFactory.create<NestExpressApplication>(
    await AppModule.forRoot(),
    { rawBody: true, bufferLogs: true },
  );

  // Use Pino as the application logger
  app.useLogger(app.get(Logger));

  // ── Security headers ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
          frameSrc: ["'self'", 'https://api.razorpay.com'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // ── Body size limit ───────────────────────────────────────────────
  app.useBodyParser('json', { limit: '1mb' });

  app.setGlobalPrefix('api');

  // ── Global interceptors & filters ─────────────────────────────────
  app.useGlobalInterceptors(new CorrelationIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS — tighten in production via ALLOWED_ORIGINS env var ──────
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-idempotency-key'],
    maxAge: 86400,
  });

  // ── Swagger / OpenAPI (disabled in production) ─────────────────
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Dhyana Stays API')
      .setDescription('Vacation rental platform for wellness retreats')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown — release port when nodemon restarts or process is terminated
  const shutdown = async (signal: string) => {
     
    console.log(`\n${signal} received - shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  const port = process.env.PORT ?? 3001;
  try {
    await app.listen(port);
     
    console.log(`🚀 Dhyana Stays API running on http://localhost:${port}/api`);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
       
      console.error(`\n❌ Port ${port} is already in use. Kill the other process first:`);
       
      console.error(`   Windows:  netstat -ano | findstr :${port}  then  taskkill /PID <pid> /F`);
       
      console.error(`   Linux:    lsof -ti:${port} | xargs kill -9\n`);
      process.exit(1);
    }
    throw err;
  }
}

void bootstrap();
