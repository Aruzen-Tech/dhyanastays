import { IsInt, IsString, MaxLength, MinLength, NotEquals } from 'class-validator';

/**
 * Manual correction to a host's balance, in paise.
 * Positive forgives debt (write-off / goodwill); negative adds debt.
 */
export class AdjustHostBalanceDto {
  @IsInt()
  @NotEquals(0)
  amount!: number;

  /** Always required — a balance change must be explainable in an audit. */
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
