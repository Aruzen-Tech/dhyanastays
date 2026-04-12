export declare enum PaymentTypeDto {
    FULL = "FULL",
    DEPOSIT = "DEPOSIT",
    BALANCE = "BALANCE"
}
export declare class InitPaymentDto {
    bookingId: string;
    type: PaymentTypeDto;
    idempotencyKey: string;
}
