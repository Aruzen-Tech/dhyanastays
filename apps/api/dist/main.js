"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const nestjs_pino_1 = require("nestjs-pino");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
const correlation_id_interceptor_1 = require("./common/interceptors/correlation-id.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(await app_module_1.AppModule.forRoot(), { rawBody: true, bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.use((0, helmet_1.default)({
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
    }));
    app.useBodyParser('json', { limit: '1mb' });
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new correlation_id_interceptor_1.CorrelationIdInterceptor());
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [
        'http://localhost:3000',
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-idempotency-key'],
        maxAge: 86400,
    });
    if (process.env.NODE_ENV !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Dhyana Stays API')
            .setDescription('Vacation rental platform for wellness retreats')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
    const shutdown = async (signal) => {
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
    }
    catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${port} is already in use. Kill the other process first:`);
            console.error(`   Windows:  netstat -ano | findstr :${port}  then  taskkill /PID <pid> /F`);
            console.error(`   Linux:    lsof -ti:${port} | xargs kill -9\n`);
            process.exit(1);
        }
        throw err;
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map