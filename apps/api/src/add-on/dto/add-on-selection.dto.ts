import { IsInt, IsString, Max, Min } from 'class-validator';

/**
 * Guest-supplied add-on selection at quote/hold time.
 * Server expands this into a full BookingAddOn snapshot.
 */
export class AddOnSelectionDto {
  @IsString()
  addOnId!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}
