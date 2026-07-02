import { ConflictException } from '@nestjs/common';
export declare class TamperedSnapshotException extends ConflictException {
    constructor(bookingId: string);
}
export declare class AmountMismatchException extends ConflictException {
    readonly capturedPaise: number;
    readonly expectedPaise: number;
    readonly bookingId: string;
    readonly paymentId: string;
    constructor(capturedPaise: number, expectedPaise: number, bookingId: string, paymentId: string);
}
