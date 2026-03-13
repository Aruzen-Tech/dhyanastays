import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
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
import { envValidationSchema } from './config/env.validation';

@Module({
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

    // BullMQ — Redis connection for all queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') ?? undefined,
        },
      }),
    }),

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

    // Background jobs
    JobsModule,
  ],
})
export class AppModule {}
