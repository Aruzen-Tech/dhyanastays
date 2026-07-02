export declare enum PaymentPlanDto {
    FULL = "FULL",
    DEPOSIT_50 = "DEPOSIT_50",
    PAY_LATER = "PAY_LATER"
}
export declare class GuestDetailsDto {
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    estimatedArrival?: string;
    specialRequests?: string;
}
export declare class CreateBookingDto {
    holdId: string;
    plan: PaymentPlanDto;
    payLaterMonths?: number;
    idempotencyKey: string;
    guestDetails: GuestDetailsDto;
    acceptedTermsAt: string;
}
