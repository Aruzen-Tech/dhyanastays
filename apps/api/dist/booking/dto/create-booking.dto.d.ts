export declare enum PaymentPlanDto {
    FULL = "FULL",
    DEPOSIT_50 = "DEPOSIT_50"
}
export declare class CreateBookingDto {
    holdId: string;
    plan: PaymentPlanDto;
    idempotencyKey: string;
}
