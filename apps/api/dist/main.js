"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'];
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`🚀 Dhyana Stays API running on http://localhost:${port}/api`);
}
void bootstrap();
//# sourceMappingURL=main.js.map