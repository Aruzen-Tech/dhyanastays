import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_GATE_KEY } from '../decorators/feature-gate.decorator';
import { FeatureFlagService } from '../../feature/feature-flag.service';

/**
 * Global guard that enforces @FeatureGate. Runs after auth/roles. If the route
 * (or its controller) is gated behind a feature flag that an admin has turned
 * off, the request is rejected with 503 — the feature is genuinely unavailable,
 * not merely hidden in the UI.
 *
 * Admins are NOT exempt: a disabled feature is disabled for everyone. The
 * admin control panel itself is never gated (it's how you turn things back on).
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string | undefined>(
      FEATURE_GATE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!featureKey) return true; // not gated

    const enabled = await this.featureFlags.isEnabled(featureKey);
    if (!enabled) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'FeatureDisabled',
        message: `This feature is currently unavailable.`,
        feature: featureKey,
      });
    }
    return true;
  }
}
