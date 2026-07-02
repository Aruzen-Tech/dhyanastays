import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Run `fn` inside a SERIALIZABLE transaction with single-shot retry on
 * serialization failure (40001 / Prisma P2034).
 *
 * Why SERIALIZABLE (not READ COMMITTED):
 *   Two concurrent confirms can each take row locks on different rows and
 *   then both pass an EXISTS-style overlap check via their own snapshots.
 *   The DB trigger backstop catches the actual double-insert, but it surfaces
 *   as a 23P01 ("could not serialize" / exclusion-style) error rather than a
 *   clean serialization retry. SERIALIZABLE turns the inconsistency into a
 *   detectable 40001 that the loser retries — the user never sees the leak.
 *
 * Why ONLY here (createHold + confirmPayment):
 *   SERIALIZABLE is real cost. Blanket adoption causes spurious failures on
 *   unrelated paths (listing edits, profile updates, etc.) with no safety
 *   gain. The spec is explicit: this wrapper is used in exactly two call
 *   sites. Grep enforced.
 *
 * Retry rules:
 *   - Retry ONLY on serialization failure (40001 / P2034). Other errors are
 *     terminal — propagating them is the correct behaviour.
 *   - Exactly one retry (configurable). More retries amplify load during a
 *     deadlock storm; one retry covers the common transient race.
 *   - Short jitter before retry so two retrying transactions don't collide.
 *
 * Critical gotcha for callers:
 *   The function body MUST re-read all state from inside the new transaction
 *   on retry. Do not capture booking/hold objects from outer scope. The wrapper
 *   passes a fresh `tx` each attempt; callers that ignore it and reuse stale
 *   data make the retry useless.
 *
 * Spec acceptance: emits a `db.serialization_retry` metric on retry. Until
 * Part V wires Prometheus, we log a structured line that includes the metric
 * name so it can be grep'd from production logs and ingested later.
 */
export async function withSerializableRetry<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: {
    /** Default 1. The spec asks for exactly one retry. */
    maxRetries?: number;
    /** Default 25ms. Random jitter before retry to break races. */
    jitterMs?: number;
    /** Default 10s. Prisma's interactive-transaction timeout. */
    timeoutMs?: number;
    /** Identifier for log/metric correlation. Defaults to fn.name. */
    path?: string;
  } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 1;
  const jitterMs = opts.jitterMs ?? 25;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const path = opts.path ?? fn.name ?? 'anonymous';
  const logger = new Logger('SerializableRetry');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: timeoutMs,
      });
    } catch (err: unknown) {
      if (!isSerializationFailure(err) || attempt >= maxRetries) {
        throw err;
      }
      // Structured log line — also the temporary metric source for
      // db.serialization_retry until Part V (Prometheus) lands.
      logger.warn(
        `metric=db.serialization_retry path=${path} attempt=${attempt + 1} maxRetries=${maxRetries}`,
      );
      await sleep(Math.random() * jitterMs);
    }
  }
  // Unreachable: the loop either returns or throws.
  throw new Error('withSerializableRetry: exhausted retries without throw');
}

/**
 * Detect serialization failure across Prisma's error mapping + raw 40001
 * leakage. Conservative — any of the following counts:
 *   - Prisma P2034 (TransactionFailedError / write conflict)
 *   - meta.code === '40001' (raw passthrough)
 *   - message contains 'could not serialize access' (PG canonical wording)
 *
 * Exclusion-style 23P01 errors from the overlap trigger are NOT serialization
 * failures — those mean the conflict is real and a retry can't help. They
 * propagate to ConflictException at the caller.
 */
function isSerializationFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as {
    code?: string;
    meta?: { code?: string };
    message?: string;
  };
  if (e.code === 'P2034') return true;
  if (e.meta?.code === '40001') return true;
  if (typeof e.message === 'string' && e.message.includes('could not serialize access')) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exported for unit tests only.
export const __internal = { isSerializationFailure };
