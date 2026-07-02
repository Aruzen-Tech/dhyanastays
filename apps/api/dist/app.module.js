"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AppModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const bullmq_1 = require("@nestjs/bullmq");
const net_1 = require("net");
const health_controller_1 = require("./health.controller");
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
const admin_module_1 = require("./admin/admin.module");
const guest_module_1 = require("./guest/guest.module");
const host_analytics_module_1 = require("./host-analytics/host-analytics.module");
const messaging_module_1 = require("./messaging/messaging.module");
const guest_assistance_module_1 = require("./guest-assistance/guest-assistance.module");
const referral_module_1 = require("./referral/referral.module");
const add_on_module_1 = require("./add-on/add-on.module");
const membership_module_1 = require("./membership/membership.module");
const pay_later_module_1 = require("./pay-later/pay-later.module");
const sos_module_1 = require("./sos/sos.module");
const investor_module_1 = require("./investor/investor.module");
const experience_module_1 = require("./experience/experience.module");
const trip_group_module_1 = require("./trip-group/trip-group.module");
const itinerary_module_1 = require("./itinerary/itinerary.module");
const feature_module_1 = require("./feature/feature.module");
const host_settings_module_1 = require("./host-settings/host-settings.module");
const throttle_tracker_interceptor_1 = require("./common/interceptors/throttle-tracker.interceptor");
const logger_module_1 = require("./common/logger/logger.module");
const dlq_module_1 = require("./common/queues/dlq.module");
const env_validation_1 = require("./config/env.validation");
function isRedisAvailable(host, port) {
    return new Promise((resolve) => {
        const socket = (0, net_1.createConnection)({ host, port, timeout: 1500 });
        let data = '';
        socket.on('connect', () => {
            socket.write('*1\r\n$4\r\nINFO\r\n');
        });
        socket.on('data', (chunk) => {
            data += chunk.toString();
            const versionMatch = data.match(/redis_version:(\d+)\.(\d+)/);
            if (versionMatch) {
                const major = parseInt(versionMatch[1], 10);
                socket.destroy();
                resolve(major >= 5);
            }
        });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('end', () => { resolve(false); });
    });
}
let AppModule = AppModule_1 = class AppModule {
    static async forRoot() {
        const redisHost = process.env.REDIS_HOST ?? 'localhost';
        const redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
        const redisUp = await isRedisAvailable(redisHost, redisPort);
        if (!redisUp) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Redis (>= 5.0) is required in production but not reachable at ${redisHost}:${redisPort}. ` +
                    `Background jobs (hold expiry, payout batches, balance-due reminders, SOS broadcast, ` +
                    `outbox dispatcher, concierge SLA) cannot run without it. Set REDIS_HOST/REDIS_PORT/REDIS_PASSWORD ` +
                    `to a reachable Redis >= 5.0 instance and restart.`);
            }
            console.warn('\n[!] Redis (>= 5.0) not available at %s:%d - background jobs disabled.\n' +
                '   Hold expiry, payout batches, and scheduled tasks will NOT run.\n' +
                '   The app works fine without Redis for local development.\n' +
                '   To enable jobs: install Redis >= 5.0 or run  docker compose up -d redis\n', redisHost, redisPort);
        }
        const redisImports = redisUp
            ? [
                bullmq_1.BullModule.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: (config) => ({
                        connection: {
                            host: config.get('REDIS_HOST', 'localhost'),
                            port: config.get('REDIS_PORT', 6379),
                            password: config.get('REDIS_PASSWORD') ?? undefined,
                            maxRetriesPerRequest: null,
                        },
                    }),
                }),
                jobs_module_1.JobsModule,
                dlq_module_1.DlqModule,
            ]
            : [];
        return {
            module: AppModule_1,
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
                logger_module_1.LoggerModule,
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
                admin_module_1.AdminModule,
                guest_module_1.GuestModule,
                host_analytics_module_1.HostAnalyticsModule,
                messaging_module_1.MessagingModule,
                guest_assistance_module_1.GuestAssistanceModule,
                referral_module_1.ReferralModule,
                add_on_module_1.AddOnModule,
                membership_module_1.MembershipModule,
                pay_later_module_1.PayLaterModule,
                sos_module_1.SosModule,
                investor_module_1.InvestorModule,
                experience_module_1.ExperienceModule,
                trip_group_module_1.TripGroupModule,
                itinerary_module_1.ItineraryModule,
                feature_module_1.FeatureModule,
                host_settings_module_1.HostSettingsModule,
                ...redisImports,
            ],
            controllers: [health_controller_1.HealthController],
            providers: [
                { provide: core_1.APP_INTERCEPTOR, useClass: throttle_tracker_interceptor_1.ThrottleTrackerInterceptor },
            ],
        };
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = AppModule_1 = __decorate([
    (0, common_1.Module)({})
], AppModule);
//# sourceMappingURL=app.module.js.map