import { IsIn, IsInt } from 'class-validator';

export const PAY_LATER_MONTH_OPTIONS = [3, 6, 12] as const;
export type PayLaterMonths = (typeof PAY_LATER_MONTH_OPTIONS)[number];

export class CreatePlanDto {
  @IsInt()
  @IsIn([...PAY_LATER_MONTH_OPTIONS])
  months!: PayLaterMonths;
}
