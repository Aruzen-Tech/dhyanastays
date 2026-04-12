import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { createConnection } from 'net';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { ListingModule } from './listing/listing.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { PricingModule } from './pricing/pricing.module';
import { HoldModule } from './hold/hold.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { PayoutModule } from './payout/payout.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificationModule } from './notification/notification.module';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { GuestModule } from './guest/guest.module';
import { HostAnalyticsModule } from './host-analytics/host-analytics.module';
import { MessagingModule } from './messaging/messaging.module';
import { GuestAssistanceModule } from './guest-assistance/guest-assistance.module';
import { ReferralModule } from './referral/referral.module';
import { ThrottleTrackerInterceptor } from './common/interceptors/throttle-tracker.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { DlqModule } from './common/queues/dlq.module';
import { envValidationSchema } from './config/env.validation';

/** Quick TCP check — resolves true if Redis port is reachable AND version >= 5.0 */
function isRedisAvailable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 1500 });
    let data = '';

    socket.on('connect', () => {
      // Send INFO server command to check Redis version
      socket.write('*1\r\n$4\r\nINFO\r\n');
    });

    socket.on('data', (chunk) => {
      data += chunk.toString();
      // Look for redis_version in the INFO response
      const versionMatch = data.match(/redis_version:(\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1], 10);
        socket.destroy();
        // BullMQ requires Redis >= 5.0
        resolve(major >= 5);
      }
    });

    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('end', () => { resolve(false); });
  });
}

@Module({})
export class AppModule {
  static async forRoot(): Promise<DynamicModule> {
    const redisHost = process.env.REDIS_HOST ?? 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const redisUp = await isRedisAvailable(redisHost, redisPort);

    if (!redisUp) {
      // eslint-disable-next-line no-console
      console.warn(
        '\n⚠️  Redis (>= 5.0) not available at %s:%d — background jobs disabled.\n' +
        '   Hold expiry, payout batches, and scheduled tasks will NOT run.\n' +
        '   The app works fine without Redis for local development.\n' +
        '   To enable jobs: install Redis >= 5.0 or run  docker compose up -d redis\n',
        redisHost,
        redisPort,
      );
    }

    const redisImports: Array<DynamicModule | typeof JobsModule | typeof DlqModule> = redisUp
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
                password: config.get<string>('REDIS_PASSWORD') ?? undefined,
                maxRetriesPerRequest: null,
              },
            }),
          }),
          JobsModule,
          DlqModule,
        ]
      : [];

    return {
      module: AppModule,
      imports: [
        // Config — global, validates env on startup
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          envFilePath: [
            `.env.${process.env.NODE_ENV ?? 'development'}.local`,
            `.env.${process.env.NODE_ENV ?? 'development'}`,
            '.env.local',
            '.env',
          ],
          validationSchema: envValidationSchema,
        }),

        // Rate limiting — 100 req/min per IP globally
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => [
            {
              ttl: config.get<number>('THROTTLE_TTL', 60000),
              limit: config.get<number>('THROTTLE_LIMIT', 100),
            },
          ],
        }),

        // Structured logging
        LoggerModule,

        // Core infrastructure
        PrismaModule,
        CommonModule,

        // Feature modules
        AuthModule,
        ListingModule,
        PricingModule,
        HoldModule,
        BookingModule,
        PaymentModule,
        PayoutModule,

        // Infrastructure services (global providers)
        NotificationModule,
        StorageModule,

        // Admin console
        AdminModule,

        // Guest features (profile, wishlist, reviews, notifications)
        GuestModule,

        // Host analytics & notifications
        HostAnalyticsModule,

        // Messaging (Guest↔Host, Host↔Admin)
        MessagingModule,

        // Guest Assistance (directions, manual, issues, check-in/out)
        GuestAssistanceModule,

        // Referral system & credit ledger
        ReferralModule,

        // Redis-dependent modules (BullMQ + Jobs) — only if Redis is reachable
        ...redisImports,
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_INTERCEPTOR, useClass: ThrottleTrackerInterceptor },
      ],
    };
  }
}
