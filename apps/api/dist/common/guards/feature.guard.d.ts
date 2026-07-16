import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../../feature/feature-flag.service';
export declare class FeatureGuard implements CanActivate {
    private readonly reflector;
    private readonly featureFlags;
    constructor(reflector: Reflector, featureFlags: FeatureFlagService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
