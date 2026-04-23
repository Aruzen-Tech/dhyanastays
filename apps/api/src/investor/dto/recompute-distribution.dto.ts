import { DistributionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class RecomputeDistributionDto {
  /** YYYY-MM period; if omitted the service uses the previous calendar month. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period must be YYYY-MM' })
  period?: string;

  /** Optional: only recompute for a single investor. */
  @IsOptional()
  @IsString()
  investorUserId?: string;
}

export class UpdateDistributionDto {
  @IsEnum(DistributionStatus)
  status!: DistributionStatus;

  @IsOptional()
  @IsString()
  ledgerEventId?: string;
}
