"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__internal = void 0;
exports.withSerializableRetry = withSerializableRetry;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
async function withSerializableRetry(prisma, fn, opts = {}) {
    const maxRetries = opts.maxRetries ?? 1;
    const jitterMs = opts.jitterMs ?? 25;
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const path = opts.path ?? fn.name ?? 'anonymous';
    const logger = new common_1.Logger('SerializableRetry');
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await prisma.$transaction(fn, {
                isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                timeout: timeoutMs,
            });
        }
        catch (err) {
            if (!isSerializationFailure(err) || attempt >= maxRetries) {
                throw err;
            }
            logger.warn(`metric=db.serialization_retry path=${path} attempt=${attempt + 1} maxRetries=${maxRetries}`);
            await sleep(Math.random() * jitterMs);
        }
    }
    throw new Error('withSerializableRetry: exhausted retries without throw');
}
function isSerializationFailure(err) {
    if (!err || typeof err !== 'object')
        return false;
    const e = err;
    if (e.code === 'P2034')
        return true;
    if (e.meta?.code === '40001')
        return true;
    if (typeof e.message === 'string' && e.message.includes('could not serialize access')) {
        return true;
    }
    return false;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.__internal = { isSerializationFailure };
//# sourceMappingURL=serializable-retry.js.map