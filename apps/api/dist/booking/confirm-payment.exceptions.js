"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmountMismatchException = exports.TamperedSnapshotException = void 0;
const common_1 = require("@nestjs/common");
class TamperedSnapshotException extends common_1.ConflictException {
    constructor(bookingId) {
        super({
            statusCode: 409,
            error: 'TamperedSnapshot',
            message: `Price snapshot HMAC failed verification for booking ${bookingId}. Payment refused.`,
            bookingId,
        });
    }
}
exports.TamperedSnapshotException = TamperedSnapshotException;
class AmountMismatchException extends common_1.ConflictException {
    constructor(capturedPaise, expectedPaise, bookingId, paymentId) {
        super({
            statusCode: 409,
            error: 'AmountMismatch',
            message: `Captured amount ${capturedPaise} paise does not match expected ${expectedPaise} paise for payment ${paymentId}.`,
            bookingId,
            paymentId,
            capturedPaise,
            expectedPaise,
        });
        this.capturedPaise = capturedPaise;
        this.expectedPaise = expectedPaise;
        this.bookingId = bookingId;
        this.paymentId = paymentId;
    }
}
exports.AmountMismatchException = AmountMismatchException;
//# sourceMappingURL=confirm-payment.exceptions.js.map