export declare const PAY_LATER_MONTH_OPTIONS: readonly [3, 6, 12];
export type PayLaterMonths = (typeof PAY_LATER_MONTH_OPTIONS)[number];
export declare class CreatePlanDto {
    months: PayLaterMonths;
}
