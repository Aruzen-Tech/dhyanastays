import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddOnSelectionDto } from '../../add-on/dto/add-on-selection.dto';

export class CreateHoldDto {
  @IsString()
  listingId!: string;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsInt()
  @Min(1)
  guests!: number;

  /**
   * Client-generated idempotency key (UUID v4 recommended).
   * Re-submitting the same key returns the existing hold.
   */
  @IsUUID()
  idempotencyKey!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnSelectionDto)
  addOns?: AddOnSelectionDto[];
}
