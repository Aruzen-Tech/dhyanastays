"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const bullmq_1 = require("@nestjs/bullmq");
const auth_module_1 = require("./auth/auth.module");
const listing_module_1 = require("./listing/listing.module");
const prisma_module_1 = require("./prisma/prisma.module");
const common_module_1 = require("./common/common.module");
const pricing_module_1 = require("./pricing/pricing.module");
const hold_module_1 = require("./hold/hold.module");
const booking_module_1 = require("./booking/booking.module");
const payment_module_1 = require("./payment/payment.module");
const payout_module_1 = require("./payout/payout.module");
const jobs_module_1 = require("./jobs/jobs.module");
const notification_module_1 = require("./notification/notification.module");
const storage_module_1 = require("./storage/storage.module");
const env_validation_1 = require("./config/env.validation");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                envFilePath: [
                    `.env.${process.env.NODE_ENV ?? 'development'}.local`,
                    `.env.${process.env.NODE_ENV ?? 'development'}`,
                    '.env.local',
                    '.env',
                ],
                validationSchema: env_validation_1.envValidationSchema,
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => [
                    {
                        ttl: config.get('THROTTLE_TTL', 60000),
                        limit: config.get('THROTTLE_LIMIT', 100),
                    },
                ],
            }),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                        password: config.get('REDIS_PASSWORD') ?? undefined,
                    },
                }),
            }),
            prisma_module_1.PrismaModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            listing_module_1.ListingModule,
            pricing_module_1.PricingModule,
            hold_module_1.HoldModule,
            booking_module_1.BookingModule,
            payment_module_1.PaymentModule,
            payout_module_1.PayoutModule,
            notification_module_1.NotificationModule,
            storage_module_1.StorageModule,
            jobs_module_1.JobsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map