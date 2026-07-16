import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  TZ: Joi.string().default('Asia/Kolkata'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  API_URL: Joi.string().allow('').default('http://localhost:3001'),
  WEB_URL: Joi.string().allow('').default('http://localhost:3000'),

  // ── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: Joi.string().required(),

  // ── JWT ──────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: Joi.string().allow('').optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // ── Rate limiting ─────────────────────────────────────────────────────────
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  ALLOWED_ORIGINS: Joi.string().allow('').default('http://localhost:3000'),

  // ── Razorpay ──────────────────────────────────────────────────────────────
  RAZORPAY_KEY_ID: Joi.string().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').default(''),

  // ── Email ─────────────────────────────────────────────────────────────────
  // Provider: stub | resend | sendgrid | smtp
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

  // ── SMS ───────────────────────────────────────────────────────────────────
  // Provider: stub | msg91 | twilio
  SMS_PROVIDER: Joi.string()
    .valid('stub', 'msg91', 'twilio')
    .default('stub'),
  MSG91_AUTH_KEY: Joi.string().allow('').default(''),
  MSG91_SENDER_ID: Joi.string().allow('').default('DHYANA'),
  MSG91_BOOKING_TEMPLATE_ID: Joi.string().allow('').default(''),
  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
  TWILIO_FROM_NUMBER: Joi.string().allow('').default(''),

  // ── Storage ───────────────────────────────────────────────────────────────
  // Provider: stub | s3 | r2
  STORAGE_PROVIDER: Joi.string()
    .valid('stub', 's3', 'r2')
    .default('stub'),
  S3_ENDPOINT: Joi.string().allow('').default(''),
  S3_BUCKET: Joi.string().allow('').default('dhyana-stays-media'),
  S3_REGION: Joi.string().allow('').default('ap-south-1'),
  S3_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  CDN_URL: Joi.string().allow('').default(''),

  // ── Auth0 (optional — when set, JWKS verification replaces static secret) ─
  AUTH0_DOMAIN: Joi.string().allow('').default(''),
  AUTH0_AUDIENCE: Joi.string().allow('').default(''),

  // ── Price snapshot signing ────────────────────────────────────────────────
  PRICE_SNAPSHOT_SECRET: Joi.string()
    .min(32)
    .default('dev-snapshot-secret-min-32-characters!'),

  // ── Meilisearch ───────────────────────────────────────────────────────────
  MEILI_URL: Joi.string().allow('').default('http://localhost:7700'),
  MEILI_MASTER_KEY: Joi.string().allow('').default('meili_dev_key'),

  // ── SOS ops (§5.12) ───────────────────────────────────────────────────────
  // First-responder ops phone (E.164) + email that every SOS incident fans out to.
  // Required in production — see env.validation.ts production block.
  SOS_OPS_PHONE: Joi.string().allow('').default(''),
  SOS_OPS_EMAIL: Joi.string().allow('').default(''),

  // ── Anthropic (AI itinerary planner §5.9) ─────────────────────────────────
  // Required in production — see env.validation.ts production block. The
  // itinerary service refuses to start without it (no silent stub fallback).
  ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
  /** Per-user monthly cost ceiling in paise. Default ₹50 ≈ ~50 generations. */
  ITINERARY_USER_MONTHLY_CAP_PAISE: Joi.number().integer().min(0).default(5000),
})
  .unknown(true)
  // ── Production-only validations ──────────────────────────────────────────
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
          'string.empty':
            'ANTHROPIC_API_KEY is required in production — the AI itinerary planner refuses to fall back to a stub plan',
        }),
    }),
  });
