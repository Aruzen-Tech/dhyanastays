import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { Observable, of, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const EXPIRY_HOURS = 24;

/**
 * DB-backed idempotency interceptor.
 *
 * When a request includes an `x-idempotency-key` header:
 *  1. If no record exists → create one with status PROCESSING, proceed normally, cache result
 *  2. If a COMPLETED record exists with matching request hash → return cached response
 *  3. If a COMPLETED record exists with different hash → 422 (key reuse with different payload)
 *  4. If a PROCESSING record exists → 409 (concurrent duplicate)
 *
 * Apply with @UseInterceptors(IdempotencyInterceptor) on mutation endpoints.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    if (!idempotencyKey) return next.handle();

    const userId = (req as unknown as { user?: { sub?: string } }).user?.sub ?? 'anonymous';
    const requestPath = `${req.method} ${req.path}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify(req.body ?? {}))
      .digest('hex');

    // Check for existing record
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      if (existing.status === 'PROCESSING') {
        throw new ConflictException(
          'Request with this idempotency key is already being processed',
        );
      }

      // COMPLETED — verify same request body
      if (existing.requestHash !== requestHash) {
        throw new UnprocessableEntityException(
          'Idempotency key already used with a different request body',
        );
      }

      // Return cached response
      if (existing.httpStatus) {
        res.status(existing.httpStatus);
      }
      return of(existing.responseBody);
    }

    // Create PROCESSING record
    await this.prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        userId,
        requestPath,
        requestHash,
        status: 'PROCESSING',
        expiresAt: new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          await this.prisma.idempotencyKey
            .update({
              where: { key: idempotencyKey },
              data: {
                status: 'COMPLETED',
                httpStatus: res.statusCode,
                responseBody: responseBody as object,
              },
            })
            .catch(() => {}); // Non-critical — key will expire naturally
        },
        error: async () => {
          // Clean up so the client can retry
          await this.prisma.idempotencyKey
            .delete({ where: { key: idempotencyKey } })
            .catch(() => {});
        },
      }),
    );
  }
}
