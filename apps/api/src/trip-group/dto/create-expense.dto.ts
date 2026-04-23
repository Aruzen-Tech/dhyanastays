import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';

export class ExpenseShareInput {
  @IsString()
  memberId!: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  amountMinor!: number;
}

export class CreateExpenseDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalMinor!: number;

  @IsIn(['EQUAL', 'CUSTOM'])
  method!: 'EQUAL' | 'CUSTOM';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  incurredAt?: string;

  // For EQUAL method: list of memberIds to split between
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds?: string[];

  // For CUSTOM method: per-member explicit amounts
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareInput)
  shares?: ExpenseShareInput[];
}
