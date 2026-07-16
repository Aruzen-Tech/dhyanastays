import { Prisma, PrismaClient } from '@prisma/client';
export declare function withSerializableRetry<T>(prisma: PrismaClient, fn: (tx: Prisma.TransactionClient) => Promise<T>, opts?: {
    maxRetries?: number;
    jitterMs?: number;
    timeoutMs?: number;
    path?: string;
}): Promise<T>;
declare function isSerializationFailure(err: unknown): boolean;
export declare const __internal: {
    isSerializationFailure: typeof isSerializationFailure;
};
export {};
