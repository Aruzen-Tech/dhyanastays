import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  TZ: Joi.string().default('Asia/Kolkata'),
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

  // ── Meilisearch ───────────────────────────────────────────────────────────
  MEILI_URL: Joi.string().allow('').default('http://localhost:7700'),
  MEILI_MASTER_KEY: Joi.string().allow('').default('meili_dev_key'),
}).unknown(true);
