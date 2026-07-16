import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpsertInvestmentDto {
  @IsString()
  investorUserId!: string;

  @IsString()
  listingId!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1)
  sharePct!: number;

  @IsISO8601()
  effectiveAt!: string;

  @IsOptional()
  @IsISO8601()
  endedAt?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
