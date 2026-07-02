import { SetMetadata } from '@nestjs/common';

export const FEATURE_GATE_KEY = 'feature_gate';

/**
 * Gate a controller or route behind a platform feature flag.
 * When the flag is disabled by an admin, the global FeatureGuard rejects the
 * request with 503 Service Unavailable.
 *
 *   @FeatureGate('ai_itinerary')
 *   @Controller('itineraries')
 *   export class ItineraryController {}
 *
 * The key MUST exist in feature-flags.registry.ts.
 */
export const FeatureGate = (featureKey: string) =>
  SetMetadata(FEATURE_GATE_KEY, featureKey);
