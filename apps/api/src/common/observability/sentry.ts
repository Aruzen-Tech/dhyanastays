import * as Sentry from '@sentry/node';

/**
 * Sentry error tracking — completely inert unless SENTRY_DSN is set.
 *
 * The SDK is free/open-source; only the hosted Sentry project (which issues the
 * DSN) needs an account, and Sentry has a free tier. With no DSN, initSentry()
 * does nothing and captureException() is a no-op, so this adds zero behaviour
 * until you opt in by setting the env var.
 */
let enabled = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // no DSN → stay inert
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Off by default — turn on sampling only when you want performance traces.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
    release: process.env.SENTRY_RELEASE || undefined,
  });
  enabled = true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Forward an exception to Sentry; no-op when Sentry isn't configured. */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
