import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',

        // JSON in production, pretty in development
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,

        // Redact sensitive fields from logs
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.currentPassword',
            'req.body.newPassword',
          ],
          censor: '[REDACTED]',
        },

        // Attach correlation ID to every log line
        customProps: (req: unknown) => {
          const r = req as { headers?: Record<string, string> };
          return {
            correlationId: r.headers?.['x-correlation-id'] ?? 'unknown',
          };
        },

        // Don't log health check endpoints to reduce noise
        autoLogging: {
          ignore: (req: unknown) => {
            const r = req as { url?: string };
            return r.url?.startsWith('/api/health') ?? false;
          },
        },
      },
    }),
  ],
})
export class LoggerModule {}
