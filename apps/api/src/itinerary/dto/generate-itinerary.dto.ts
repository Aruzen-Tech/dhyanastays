import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ItineraryPreferencesDto } from './itinerary-preferences.dto';

export class GenerateItineraryDto extends ItineraryPreferencesDto {
  @IsOptional()
  @IsString()
  listingId?: string;

  /** Stable concept key selected from itinerary suggestions. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  themeHint?: string;
}
