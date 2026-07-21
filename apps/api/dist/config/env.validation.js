"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'test', 'staging', 'production')
        .default('development'),
    PORT: Joi.number().port().default(3001),
    TZ: Joi.string().default('Asia/Kolkata'),
    LOG_LEVEL: Joi.string()
        .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
        .default('info'),
    API_URL: Joi.string().allow('').default('http://localhost:3001'),
    WEB_URL: Joi.string().allow('').default('http://localhost:3000'),
    DATABASE_URL: Joi.string().required(),
    JWT_ACCESS_SECRET: Joi.string().min(16).required(),
    JWT_REFRESH_SECRET: Joi.string().min(16).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
    REDIS_URL: Joi.string().allow('').optional(),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().port().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),
    THROTTLE_TTL: Joi.number().default(60000),
    THROTTLE_LIMIT: Joi.number().default(100),
    ALLOWED_ORIGINS: Joi.string().allow('').default('http://localhost:3000'),
    RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
    RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
    RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),
    EMAIL_PROVIDER: Joi.string()
        .valid('stub', 'resend', 'sendgrid', 'smtp')
        .default('stub'),
    EMAIL_FROM: Joi.string().allow('').default('noreply@dhyanastays.com'),
    RESEND_API_KEY: Joi.string().allow('').default(''),
    SENDGRID_API_KEY: Joi.string().allow('').default(''),
    SMTP_HOST: Joi.string().allow('').default(''),
    SMTP_PORT: Joi.number().port().default(587),
    SMTP_USER: Joi.string().allow('').default(''),
    SMTP_PASS: Joi.string().allow('').default(''),
    SMS_PROVIDER: Joi.string()
        .valid('stub', 'msg91', 'twilio')
        .default('stub'),
    MSG91_AUTH_KEY: Joi.string().allow('').default(''),
    MSG91_SENDER_ID: Joi.string().allow('').default('DHYANA'),
    MSG91_BOOKING_TEMPLATE_ID: Joi.string().allow('').default(''),
    TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
    TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
    TWILIO_FROM_NUMBER: Joi.string().allow('').default(''),
    STORAGE_PROVIDER: Joi.string()
        .valid('stub', 's3', 'r2')
        .default('stub'),
    S3_ENDPOINT: Joi.string().allow('').default(''),
    S3_BUCKET: Joi.string().allow('').default('dhyana-stays-media'),
    S3_REGION: Joi.string().allow('').default('ap-south-1'),
    S3_ACCESS_KEY_ID: Joi.string().allow('').default(''),
    S3_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
    CDN_URL: Joi.string().allow('').default(''),
    AUTH0_DOMAIN: Joi.string().allow('').default(''),
    AUTH0_AUDIENCE: Joi.string().allow('').default(''),
    PRICE_SNAPSHOT_SECRET: Joi.string()
        .min(32)
        .default('dev-snapshot-secret-min-32-characters!'),
    MEILI_URL: Joi.string().allow('').default('http://localhost:7700'),
    MEILI_MASTER_KEY: Joi.string().allow('').default('meili_dev_key'),
    SOS_OPS_PHONE: Joi.string().allow('').default(''),
    SOS_OPS_EMAIL: Joi.string().allow('').default(''),
    SENTRY_DSN: Joi.string().allow('').default(''),
    SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),
    SENTRY_RELEASE: Joi.string().allow('').default(''),
    ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
    ITINERARY_USER_MONTHLY_CAP_PAISE: Joi.number().integer().min(0).default(5000),
})
    .unknown(true)
    .when(Joi.object({ NODE_ENV: 'production' }).unknown(), {
    then: Joi.object({
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        PRICE_SNAPSHOT_SECRET: Joi.string().min(32).invalid('dev-snapshot-secret-min-32-characters!').required(),
        RAZORPAY_KEY_ID: Joi.string().min(1).required()
            .messages({ 'string.empty': 'RAZORPAY_KEY_ID is required in production (no stub mode)' }),
        RAZORPAY_KEY_SECRET: Joi.string().min(1).required(),
        RAZORPAY_WEBHOOK_SECRET: Joi.string().min(1).required(),
        ALLOWED_ORIGINS: Joi.string().invalid('http://localhost:3000').required()
            .messages({ 'any.invalid': 'ALLOWED_ORIGINS must not be localhost in production' }),
        STORAGE_PROVIDER: Joi.string().valid('s3', 'r2').required()
            .messages({ 'any.only': 'STORAGE_PROVIDER must be s3 or r2 in production (not stub)' }),
        EMAIL_PROVIDER: Joi.string().valid('resend', 'sendgrid', 'smtp').required()
            .messages({ 'any.only': 'EMAIL_PROVIDER must not be stub in production' }),
        SMS_PROVIDER: Joi.string().valid('msg91', 'twilio').required()
            .messages({ 'any.only': 'SMS_PROVIDER must not be stub in production' }),
        REDIS_HOST: Joi.string().min(1).invalid('localhost', '127.0.0.1').required()
            .messages({ 'any.invalid': 'REDIS_HOST must not be localhost in production — point to a managed Redis >= 5.0' }),
        SOS_OPS_PHONE: Joi.string()
            .pattern(/^\+[1-9]\d{6,14}$/)
            .required()
            .messages({
            'string.empty': 'SOS_OPS_PHONE is required in production — the first-responder ops phone in E.164 (e.g. +919876543210)',
            'string.pattern.base': 'SOS_OPS_PHONE must be E.164 (e.g. +919876543210). No spaces, no dashes.',
        }),
        SOS_OPS_EMAIL: Joi.string()
            .email()
            .required()
            .messages({
            'string.empty': 'SOS_OPS_EMAIL is required in production — the first-responder ops mailbox',
        }),
        ANTHROPIC_API_KEY: Joi.string()
            .min(10)
            .required()
            .messages({
            'string.empty': 'ANTHROPIC_API_KEY is required in production — the AI itinerary planner refuses to fall back to a stub plan',
        }),
    }),
});
//# sourceMappingURL=env.validation.js.map