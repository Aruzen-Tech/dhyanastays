import { ItineraryPreferencesDto } from './itinerary-preferences.dto';

/**
 * Request body for `POST /itineraries/suggestions`.
 *
 * Returns concept cards before the user commits to full itinerary generation.
 * The shared preference fields are inherited by GenerateItineraryDto so the
 * user does not need to re-enter trip details.
 */
export class SuggestItineraryDto extends ItineraryPreferencesDto {}
